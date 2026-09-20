/**
 * The mock's in-memory state and the levers over it.
 *
 * Everything here is module-scoped and mutable on purpose: it stands in for a
 * database, and `reset()` is the equivalent of reseeding one between tests.
 */
import { ApiError, type ApiErrorCode } from "../errors";
import type { Actor, LatencyRange } from "../contract";
import type { Job, PlatformSettings } from "../types";
import {
  SEED_CUSTOMER,
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
  settings: PlatformSettings;
  actor: Actor;
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
    settings: { ...seedSettings },
    actor: { ...SEED_ACTOR },
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
  categories: seedCategories,
  businesses: seedBusinesses,
  technicians: seedTechnicians,

  setActor(actor: Actor): void {
    state.actor = { ...actor };
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
