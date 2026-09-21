/**
 * The mock's in-memory state and the levers over it.
 *
 * Everything here is module-scoped and mutable on purpose: it stands in for a
 * database, and `reset()` is the equivalent of reseeding one between tests.
 */
import { ApiError, type ApiErrorCode } from "../errors";
import type { Actor, LatencyRange } from "../contract";
import type { Job, PlatformSettings, SessionUser } from "../types";
import {
  SEED_CUSTOMER,
  type MockAccount,
  seedAccounts,
  seedBusinesses,
  seedCategories,
  seedJobs,
  seedSettings,
  seedTechnicians,
} from "./seed";

/** Slow enough that a spinner is real, fast enough to develop against. */
const DEFAULT_LATENCY: LatencyRange = { min: 140, max: 420 };

const SEED_ACTOR: Actor = { role: "customer", id: SEED_CUSTOMER.id };

type State = {
  jobs: Job[];
  /**
   * Seeded, then appended to by `signUp`. In `State` rather than read straight
   * off the seed module so `reset()` drops the accounts a test created, the way
   * reseeding a database would.
   */
  accounts: MockAccount[];
  settings: PlatformSettings;
  actor: Actor;
  /** What `setAccessToken` was last handed. Null means no session. */
  accessToken: string | null;
  /**
   * Tokens `signOut` has retired. In memory, so it empties on reload — which
   * is right for a mock and wrong for a backend, where revocation outlives a
   * process.
   */
  revoked: Set<string>;
  latency: LatencyRange;
  failureRate: number;
  pendingFailure: ApiErrorCode | null;
  /** `Idempotency-Key` to the job it produced, per §3. */
  idempotency: Map<string, Job>;
  counter: number;
};

function freshState(): State {
  return {
    jobs: seedJobs(new Date()),
    accounts: seedAccounts.map((account) => ({ ...account })),
    settings: { ...seedSettings },
    actor: { ...SEED_ACTOR },
    accessToken: null,
    revoked: new Set<string>(),
    latency: { ...DEFAULT_LATENCY },
    failureRate: 0,
    pendingFailure: null,
    idempotency: new Map(),
    counter: 0,
  };
}

let state: State = freshState();

export const store = {
  get jobs(): Job[] {
    return state.jobs;
  },
  get settings(): PlatformSettings {
    return state.settings;
  },
  get actor(): Actor {
    return state.actor;
  },
  get idempotency(): Map<string, Job> {
    return state.idempotency;
  },
  get accessToken(): string | null {
    return state.accessToken;
  },
  get accounts(): readonly MockAccount[] {
    return state.accounts;
  },
  categories: seedCategories,
  businesses: seedBusinesses,
  technicians: seedTechnicians,

  setActor(actor: Actor): void {
    state.actor = { ...actor };
  },

  /**
   * The signed-in caller, or null.
   *
   * Tokens are self-describing — `mock-access.<userId>.<nonce>` — rather than
   * rows in a table the mock holds. A table would empty on every reload, so a
   * session restored from SecureStore would fail validation on each cold start
   * and the persistence this step exists to build would never once be
   * observable. A real JWT is self-describing too, so this is the shape the
   * backend produces, not a shortcut around it.
   */
  userForToken(token: string | null): SessionUser | null {
    if (token === null || state.revoked.has(token)) return null;
    const id = /^mock-access\.([^.]+)\./.exec(token)?.[1];
    if (id === undefined) return null;
    return state.accounts.find((account) => account.user.id === id)?.user ?? null;
  },

  /** `signUp`'s side of the store. The only way the account list grows. */
  addAccount(account: MockAccount): void {
    state.accounts.push(account);
  },

  /**
   * Point the adapter at a session, and with it the actor every §6 guard is
   * checked against.
   *
   * An unknown or retired token authenticates nobody: the actor falls back to
   * the seed customer so the dev screen and step 4's tests keep working
   * unsigned-in, while `getMe` still answers 401 and the session store still
   * signs out. The real backend has no such fallback, and step 14 takes it
   * away with the rest of the mock.
   */
  setAccessToken(token: string | null): void {
    state.accessToken = token;
    const user = this.userForToken(token);
    state.actor = user === null ? { ...SEED_ACTOR } : { role: user.role, id: user.id };
  },

  revoke(token: string | null): void {
    if (token !== null) state.revoked.add(token);
  },
  setLatency(latency: LatencyRange | number): void {
    state.latency =
      typeof latency === "number" ? { min: latency, max: latency } : { ...latency };
  },
  setFailureRate(rate: number): void {
    state.failureRate = Math.min(1, Math.max(0, rate));
  },
  failNext(code: ApiErrorCode): void {
    state.pendingFailure = code;
  },
  reset(): void {
    state = freshState();
  },

  /** Monotonic, so a seeded run produces the same ids every time. */
  nextId(prefix: string): string {
    state.counter += 1;
    return `${prefix}-${state.counter}`;
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function failureFor(code: ApiErrorCode): ApiError {
  if (code === "network_error") {
    return new ApiError("network_error", "The request could not be sent.", 0);
  }
  return new ApiError(code, "Something went wrong on our end.", 500);
}

/**
 * Every adapter call goes through here: it pays the latency cost, then decides
 * whether to fail before the handler ever runs.
 *
 * A forced failure is consumed whether or not the handler would have succeeded,
 * which is the point — it simulates the request dying in transit, not the
 * server rejecting it.
 */
export async function withTransport<T>(handler: () => T | Promise<T>): Promise<T> {
  const { min, max } = state.latency;
  const delay = min >= max ? min : min + Math.random() * (max - min);
  if (delay > 0) await sleep(delay);

  const forced = state.pendingFailure;
  if (forced !== null) {
    state.pendingFailure = null;
    throw failureFor(forced);
  }
  if (state.failureRate > 0 && Math.random() < state.failureRate) {
    throw failureFor("server_error");
  }

  return handler();
}

/**
 * A copy, so a caller mutating what it got back cannot corrupt the store.
 *
 * A JSON round trip rather than `structuredClone`, for two reasons. React
 * Native does not install `structuredClone` as a global — the module exists at
 * a private path but nothing in `setUpDefaultReactNativeEnvironment` exposes
 * it — so it is `undefined` on device even though Node has it, which would
 * make this crash only outside the test runner.
 *
 * It is also the more honest copy: the HTTP adapter will hand out objects
 * parsed from JSON, so anything that cannot survive a round trip is a value the
 * real adapter could never return. A `Date` or an `undefined` leaking into the
 * store fails here rather than at step 14.
 */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
