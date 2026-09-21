/**
 * Hydration, which is the part of the session that is easy to get subtly wrong
 * and impossible to see going wrong.
 *
 * Three behaviours matter and none of them is visible from a screen: a stored
 * session routes immediately rather than after a round trip, a `401` is
 * terminal, and anything else is not. The third is the one worth a test —
 * signing out on a failed request would log people out every time they opened
 * the app somewhere with no signal.
 *
 * `@/api` and the storage module are both mocked: the real ones reach
 * `expo-constants` and `expo-secure-store`, which are native modules the Node
 * test project cannot load.
 */
import { ApiError } from "@/api/errors";
import type { AuthSession, SessionUser } from "@/api/types";

import { resetSessionHydration, useSessionStore } from "./session";

jest.mock("@/api", () => ({
  api: {
    setAccessToken: jest.fn(),
    getMe: jest.fn(),
  },
  // Re-exported rather than stubbed: the store branches on it, and a stub that
  // always said false would make the 401 case pass for the wrong reason.
  isApiError: (error: unknown) =>
    error instanceof jest.requireActual("@/api/errors").ApiError,
}));

jest.mock("@/lib/session-storage", () => ({
  loadSession: jest.fn(),
  saveSession: jest.fn(),
  clearSession: jest.fn(),
}));

const { api } = jest.requireMock("@/api") as {
  api: { setAccessToken: jest.Mock; getMe: jest.Mock };
};
const storage = jest.requireMock("@/lib/session-storage") as {
  loadSession: jest.Mock;
  saveSession: jest.Mock;
  clearSession: jest.Mock;
};

const USER: SessionUser = {
  id: "arman",
  role: "customer",
  name: "Arman G.",
  email: "arman@pynaro.test",
  phone: "(424) 888-5555",
  businessId: null,
};

const STORED = { accessToken: "access-1", refreshToken: "refresh-1", user: USER };

const SESSION: AuthSession = {
  accessToken: "access-2",
  refreshToken: "refresh-2",
  accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: USER,
};

beforeEach(() => {
  jest.clearAllMocks();
  resetSessionHydration();
  useSessionStore.setState({
    session: { status: "hydrating", user: null },
    pendingSession: null,
  });
  storage.loadSession.mockResolvedValue(null);
  storage.clearSession.mockResolvedValue(undefined);
  storage.saveSession.mockResolvedValue(undefined);
  api.getMe.mockResolvedValue(USER);
});

const session = () => useSessionStore.getState().session;

describe("hydrate", () => {
  it("resolves to signed-out when nothing is stored", async () => {
    await useSessionStore.getState().hydrate();
    expect(session().status).toBe("signed-out");
    expect(api.getMe).not.toHaveBeenCalled();
  });

  it("restores a stored session and hands the adapter its token", async () => {
    storage.loadSession.mockResolvedValue(STORED);
    await useSessionStore.getState().hydrate();
    expect(session()).toEqual({ status: "signed-in", user: USER });
    expect(api.setAccessToken).toHaveBeenCalledWith("access-1");
  });

  it("routes on the stored user before the server confirms it", async () => {
    storage.loadSession.mockResolvedValue(STORED);
    // A `getMe` that never settles stands in for a slow connection.
    api.getMe.mockReturnValue(new Promise(() => {}));

    const hydrating = useSessionStore.getState().hydrate();
    // Let the storage read resolve, but not the request.
    await Promise.resolve();
    await Promise.resolve();
    expect(session().status).toBe("signed-in");
    void hydrating;
  });

  it("adopts the server's user over the stored one", async () => {
    storage.loadSession.mockResolvedValue(STORED);
    const renamed = { ...USER, name: "Arman Ghazaryan" };
    api.getMe.mockResolvedValue(renamed);
    await useSessionStore.getState().hydrate();
    expect(session().user).toEqual(renamed);
  });

  it("signs out on a 401, which is the server refusing the token", async () => {
    storage.loadSession.mockResolvedValue(STORED);
    api.getMe.mockRejectedValue(new ApiError("unauthenticated", "no", 401));
    await useSessionStore.getState().hydrate();
    expect(session().status).toBe("signed-out");
    expect(storage.clearSession).toHaveBeenCalled();
    expect(api.setAccessToken).toHaveBeenLastCalledWith(null);
  });

  it("stays signed in when the request merely failed", async () => {
    // Offline, or a 500. Neither is the server saying no, and signing out on
    // them would log people out every time they opened the app on a train.
    storage.loadSession.mockResolvedValue(STORED);
    api.getMe.mockRejectedValue(new ApiError("network_error", "offline", 0));
    await useSessionStore.getState().hydrate();
    expect(session()).toEqual({ status: "signed-in", user: USER });
    expect(storage.clearSession).not.toHaveBeenCalled();
  });

  it("runs once however many callers ask", async () => {
    storage.loadSession.mockResolvedValue(STORED);
    await Promise.all([
      useSessionStore.getState().hydrate(),
      useSessionStore.getState().hydrate(),
      useSessionStore.getState().hydrate(),
    ]);
    expect(storage.loadSession).toHaveBeenCalledTimes(1);
  });
});

describe("adopt", () => {
  it("persists before it announces", async () => {
    const order: string[] = [];
    storage.saveSession.mockImplementation(async () => void order.push("save"));
    useSessionStore.subscribe(() => order.push(session().status));

    await useSessionStore.getState().adopt(SESSION);
    expect(order).toEqual(["save", "signed-in"]);
  });

  it("leaves the session alone when the keychain refuses", async () => {
    // A sign-in that reaches the UI but not the keychain is one the next cold
    // start silently undoes, so it has to fail loudly instead.
    storage.saveSession.mockRejectedValue(new Error("keychain unavailable"));
    await expect(useSessionStore.getState().adopt(SESSION)).rejects.toThrow();
    expect(session().status).toBe("hydrating");
    expect(api.setAccessToken).not.toHaveBeenCalled();
  });
});

describe("forget", () => {
  it("clears the token, the keychain and the state", async () => {
    storage.loadSession.mockResolvedValue(STORED);
    await useSessionStore.getState().hydrate();

    await useSessionStore.getState().forget();
    expect(session()).toEqual({ status: "signed-out", user: null });
    expect(api.setAccessToken).toHaveBeenLastCalledWith(null);
    expect(storage.clearSession).toHaveBeenCalled();
  });
});

describe("onboarding", () => {
  const pending = () => useSessionStore.getState().pendingSession;

  it("holds a signed-up session without going signed-in", async () => {
    // The whole reason this exists: §2's gate unmounts `(auth)` the moment a
    // session exists, so the setup screen could not run if sign-up adopted.
    useSessionStore.getState().beginOnboarding(SESSION);
    expect(pending()).toBe(SESSION);
    expect(session().status).toBe("hydrating");
    expect(storage.saveSession).not.toHaveBeenCalled();
    expect(api.setAccessToken).not.toHaveBeenCalled();
  });

  it("adopts the held session when onboarding finishes", async () => {
    useSessionStore.getState().beginOnboarding(SESSION);
    await useSessionStore.getState().completeOnboarding();

    expect(session()).toEqual({ status: "signed-in", user: USER });
    expect(storage.saveSession).toHaveBeenCalledWith(SESSION);
    expect(pending()).toBeNull();
  });

  it("does nothing when there is nothing held", async () => {
    await useSessionStore.getState().completeOnboarding();
    expect(session().status).toBe("hydrating");
    expect(storage.saveSession).not.toHaveBeenCalled();
  });

  it("keeps holding it when the keychain refuses", async () => {
    // Same rule as `adopt`: a session that did not persist must not be
    // announced. Here that also means onboarding is still resumable.
    storage.saveSession.mockRejectedValue(new Error("keychain unavailable"));
    useSessionStore.getState().beginOnboarding(SESSION);

    await expect(useSessionStore.getState().completeOnboarding()).rejects.toThrow();
    expect(session().status).toBe("hydrating");
    expect(pending()).toBe(SESSION);
  });

  it("drops a half-finished sign-up on sign-out", async () => {
    useSessionStore.getState().beginOnboarding(SESSION);
    await useSessionStore.getState().forget();
    expect(pending()).toBeNull();
  });
});
