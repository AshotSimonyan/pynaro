/**
 * Step 6's half of the mock: sign-in, sign-out, and the access token deciding
 * who the §6 guards are checked against.
 *
 * The point of most of these is that the role is the server's answer. The app
 * has no role picker (§2), so if `signIn` did not settle it, nothing would.
 */
import { ApiError } from "../errors";

import { mockApi as api, mockDevControls as dev } from "./index";

const CUSTOMER = { email: "arman@pynaro.test", password: "pynaro" };
const TECHNICIAN = { email: "marcus@andys.test", password: "pynaro" };

beforeEach(() => {
  dev.reset();
  dev.setLatency(0);
});

/** Captures the error an awaited call throws, so its fields can be asserted. */
async function failure(run: () => Promise<unknown>): Promise<ApiError> {
  try {
    await run();
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("expected the call to fail");
}

describe("signIn", () => {
  it("returns the customer's role from the server, not from the caller", async () => {
    const session = await api.signIn(CUSTOMER);
    expect(session.user.role).toBe("customer");
    expect(session.user.id).toBe("arman");
    expect(session.user.businessId).toBeNull();
  });

  it("returns the technician's role and their business", async () => {
    const session = await api.signIn(TECHNICIAN);
    expect(session.user.role).toBe("technician");
    // "No lead blasting" (§6) is enforced against this, so it has to be here.
    expect(session.user.businessId).toBe("andys");
  });

  it("issues two distinct tokens and an expiry", async () => {
    const session = await api.signIn(CUSTOMER);
    expect(session.accessToken).not.toBe(session.refreshToken);
    expect(Date.parse(session.accessTokenExpiresAt)).toBeGreaterThan(Date.now());
  });

  it("is case-insensitive about the address", async () => {
    const session = await api.signIn({ ...CUSTOMER, email: "Arman@Pynaro.Test " });
    expect(session.user.id).toBe("arman");
  });

  it("says the same thing about a wrong address and a wrong password", async () => {
    // Different answers would tell an attacker which addresses have accounts.
    const unknown = await failure(() =>
      api.signIn({ email: "nobody@pynaro.test", password: "pynaro" }),
    );
    const wrong = await failure(() => api.signIn({ ...CUSTOMER, password: "nope" }));
    expect(unknown.status).toBe(401);
    expect(unknown.code).toBe("unauthenticated");
    expect(wrong.message).toBe(unknown.message);
  });

  it("rejects empty input as validation, not as a bad password", async () => {
    const blank = await failure(() => api.signIn({ email: "", password: "pynaro" }));
    expect(blank.code).toBe("validation_failed");
    expect(blank.field).toBe("email");
  });
});

describe("the access token", () => {
  it("decides the actor the state machine checks", async () => {
    await api.signIn(TECHNICIAN);
    expect(dev.currentActor()).toEqual({ role: "technician", id: "marcus" });

    // Marcus is assigned job-seed-en-route, so this is an intent he owns.
    const job = await api.arriveJob("job-seed-en-route");
    expect(job.status).toBe("arrived");
  });

  it("refuses an intent that belongs to the other role", async () => {
    await api.signIn(TECHNICIAN);
    const error = await failure(() => api.cancelJob("job-seed-requested"));
    expect(error.code).toBe("forbidden_actor");
    expect(error.status).toBe(403);
  });

  it("survives being handed back after a restart", async () => {
    // The whole point of persisting it. A token table held in memory would
    // empty on reload and every cold start would sign the user out.
    const session = await api.signIn(TECHNICIAN);
    dev.reset();
    dev.setLatency(0);
    api.setAccessToken(session.accessToken);
    expect((await api.getMe()).id).toBe("marcus");
  });

  it("authenticates nobody when it is unknown", async () => {
    api.setAccessToken("mock-access.someone-else.9");
    const error = await failure(() => api.getMe());
    expect(error.code).toBe("unauthenticated");
    expect(error.status).toBe(401);
  });

  it("authenticates nobody when it is absent", async () => {
    api.setAccessToken(null);
    expect((await failure(() => api.getMe())).status).toBe(401);
  });
});

describe("signOut", () => {
  it("retires the token it was holding", async () => {
    const session = await api.signIn(CUSTOMER);
    await api.signOut();
    expect((await failure(() => api.getMe())).status).toBe(401);

    // And the retired token cannot be put back, which is what distinguishes
    // signing out from merely forgetting.
    api.setAccessToken(session.accessToken);
    expect((await failure(() => api.getMe())).status).toBe(401);
  });

  it("leaves a different session alone", async () => {
    const customer = await api.signIn(CUSTOMER);
    await api.signOut();
    const technician = await api.signIn(TECHNICIAN);
    expect((await api.getMe()).id).toBe("marcus");
    expect(technician.accessToken).not.toBe(customer.accessToken);
  });
});
