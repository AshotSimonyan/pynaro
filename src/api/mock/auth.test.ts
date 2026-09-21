/**
 * The mock's session surface: sign-in, sign-up, Apple and Google, sign-out, and
 * the access token deciding who the §6 guards are checked against.
 *
 * The point of most of these is that the role is the server's answer. The app
 * has no role picker (§2), so if `signIn` did not settle it, nothing would.
 */
import { ApiError } from "../errors";

import { mockApi as api, mockDevControls as dev } from "./index";

const CUSTOMER = { email: "arman@pynaro.test", password: "pynaro" };
const TECHNICIAN = { email: "marcus@andys.test", password: "pynaro" };

const NEW_ACCOUNT = {
  name: "Nora Bennett",
  phone: "(424) 555-0132",
  email: "nora@pynaro.test",
  password: "pynaro-demo",
  acceptedTerms: true,
};

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

describe("signUp", () => {
  it("creates an account that can then sign in", async () => {
    const created = await api.signUp(NEW_ACCOUNT);
    expect(created.user.email).toBe("nora@pynaro.test");

    await api.signOut();
    const session = await api.signIn({
      email: NEW_ACCOUNT.email,
      password: NEW_ACCOUNT.password,
    });
    expect(session.user.id).toBe(created.user.id);
  });

  it("issues a session the very next call is authenticated by", async () => {
    // The screen goes straight on to onboarding, so the account has to be
    // usable without a separate sign-in round trip.
    const session = await api.signUp(NEW_ACCOUNT);
    expect((await api.getMe()).id).toBe(session.user.id);
  });

  it("always creates a customer, whatever the caller wants", async () => {
    // §2: the client does not choose a role. There is no field to try, which
    // is the point — this pins that `SignUpInput` never grows one.
    const session = await api.signUp(NEW_ACCOUNT);
    expect(session.user.role).toBe("customer");
    expect(session.user.businessId).toBeNull();
  });

  it("normalises the email and trims the rest", async () => {
    const session = await api.signUp({
      ...NEW_ACCOUNT,
      name: "  Nora Bennett  ",
      email: " Nora@Pynaro.Test ",
    });
    expect(session.user.email).toBe("nora@pynaro.test");
    expect(session.user.name).toBe("Nora Bennett");
  });

  it("refuses an email that already has an account, and says so", async () => {
    const error = await failure(() =>
      api.signUp({ ...NEW_ACCOUNT, email: CUSTOMER.email }),
    );
    expect(error.code).toBe("validation_failed");
    expect(error.field).toBe("email");
  });

  it("names the field it rejected, so the screen can mark it", async () => {
    const cases: [Partial<typeof NEW_ACCOUNT>, string][] = [
      [{ name: " " }, "name"],
      [{ phone: "424" }, "phone"],
      [{ email: "not-an-email" }, "email"],
      [{ password: "short" }, "password"],
      [{ acceptedTerms: false }, "acceptedTerms"],
    ];
    for (const [override, field] of cases) {
      const error = await failure(() => api.signUp({ ...NEW_ACCOUNT, ...override }));
      expect(error.code).toBe("validation_failed");
      expect(error.field).toBe(field);
    }
  });

  it("creates nothing when it rejects", async () => {
    await failure(() => api.signUp({ ...NEW_ACCOUNT, acceptedTerms: false }));
    const error = await failure(() =>
      api.signIn({ email: NEW_ACCOUNT.email, password: NEW_ACCOUNT.password }),
    );
    expect(error.status).toBe(401);
  });

  it("is undone by reset, the way reseeding a database would be", async () => {
    await api.signUp(NEW_ACCOUNT);
    dev.reset();
    dev.setLatency(0);
    expect(
      (
        await failure(() =>
          api.signIn({ email: NEW_ACCOUNT.email, password: NEW_ACCOUNT.password }),
        )
      ).status,
    ).toBe(401);
  });
});

describe("signInWithProvider", () => {
  it("returns a real session for a distinct identity, not the seed customer", async () => {
    const apple = await api.signInWithProvider("apple");
    expect(apple.user.role).toBe("customer");
    expect(apple.user.id).not.toBe("arman");
    expect((await api.getMe()).id).toBe(apple.user.id);
  });

  it("gives Apple and Google different accounts", async () => {
    const apple = await api.signInWithProvider("apple");
    const google = await api.signInWithProvider("google");
    expect(apple.user.id).not.toBe(google.user.id);
  });

  it("returns the same account on a second sign-in", async () => {
    // It is a sign-in, not a sign-up: the provider identifies someone who
    // already exists, so a second tap must not fork a new account.
    const first = await api.signInWithProvider("google");
    await api.signOut();
    const second = await api.signInWithProvider("google");
    expect(second.user.id).toBe(first.user.id);
  });

  it("does not let a social account be signed into with a password", async () => {
    const apple = await api.signInWithProvider("apple");
    await api.signOut();
    // `"null"` and `"undefined"` because the bug this guards against is a
    // stored null being compared against a string that stringifies to it.
    for (const password of ["pynaro", "null", "undefined"]) {
      const error = await failure(() =>
        api.signIn({ email: apple.user.email, password }),
      );
      expect(error.status).toBe(401);
      expect(error.code).toBe("unauthenticated");
    }
  });

  it("refuses an empty password before it looks the account up", async () => {
    // A 422 rather than a 401: nothing was attempted, so nothing was rejected.
    const error = await failure(() =>
      api.signIn({ email: "x7k2p9@privaterelay.appleid.test", password: "" }),
    );
    expect(error.status).toBe(422);
    expect(error.field).toBe("password");
  });
});
