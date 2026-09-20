/**
 * The real adapter. Empty until step 14, when the backend exists and this is
 * built on `openapi-fetch` over the generated `schema.d.ts` (§3 of
 * docs/architecture.md).
 *
 * It is typed as `Api` now so the contract is enforced from both sides: adding
 * a function to `Api` breaks this file immediately rather than at step 14.
 */
import type { Api, DevControls } from "../contract";
import { ApiError } from "../errors";

function notImplemented(name: string): never {
  throw new ApiError(
    "server_error",
    `The HTTP adapter is not built yet (${name}). Set EXPO_PUBLIC_API_MODE=mock until step 14.`,
    501,
  );
}

export const httpApi: Api = {
  signIn: () => notImplemented("signIn"),
  signOut: () => notImplemented("signOut"),
  getMe: () => notImplemented("getMe"),
  // Void rather than throwing: the session store calls this on every start,
  // before anything has had a chance to notice the adapter is a stub, and a
  // throw here would fail hydration instead of the first real request.
  setAccessToken: () => {},
  listCategories: () => notImplemented("listCategories"),
  listBusinesses: () => notImplemented("listBusinesses"),
  getBusiness: () => notImplemented("getBusiness"),
  listTechnicians: () => notImplemented("listTechnicians"),
  getTechnician: () => notImplemented("getTechnician"),
  getSettings: () => notImplemented("getSettings"),
  listJobs: () => notImplemented("listJobs"),
  getJob: () => notImplemented("getJob"),
  createJob: () => notImplemented("createJob"),
  acceptJob: () => notImplemented("acceptJob"),
  cancelJob: () => notImplemented("cancelJob"),
  departJob: () => notImplemented("departJob"),
  arriveJob: () => notImplemented("arriveJob"),
  sendEstimate: () => notImplemented("sendEstimate"),
  approveEstimate: () => notImplemented("approveEstimate"),
  declineEstimate: () => notImplemented("declineEstimate"),
  startJob: () => notImplemented("startJob"),
  completeJob: () => notImplemented("completeJob"),
  payJob: () => notImplemented("payJob"),
};

/**
 * There is nothing to control on a real server: latency is real, failures are
 * real, and the actor comes from the token. Every method is a no-op and
 * `available` is false so a dev screen can hide itself.
 */
export const httpDevControls: DevControls = {
  available: false,
  reset: () => {},
  setLatency: () => {},
  setFailureRate: () => {},
  failNext: () => {},
  actAs: () => {},
  currentActor: () => ({ role: "customer", id: "unknown" }),
};
