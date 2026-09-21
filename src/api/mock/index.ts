/**
 * The mock adapter. It plays the backend: it owns the state machine, enforces
 * its guards, and refuses an illegal intent the way §6 says the server will.
 *
 * Nothing above `src/api` imports this file — `src/api/index.ts` chooses it.
 */
import type {
  Actor,
  Api,
  CreateJobInput,
  DevControls,
  ListJobsParams,
  Page,
  SignInInput,
  SignUpInput,
  WriteOptions,
} from "../contract";
import { ApiError, JobConflictError, type ApiErrorCode } from "../errors";
import type {
  AuthSession,
  Business,
  Category,
  Cents,
  EstimateItem,
  Job,
  JobStatus,
  JobTrigger,
  PlatformSettings,
  SessionUser,
  Technician,
} from "../types";
import { findTransition, triggersFrom, type TransitionPayload } from "./machine";
import { SEED_CUSTOMER, USD } from "./seed";
import { clone, store, withTransport } from "./store";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

function notFound(what: string, id: string): ApiError {
  return new ApiError("not_found", `No ${what} with id "${id}".`, 404);
}

function invalid(message: string, field: string): ApiError {
  return new ApiError("validation_failed", message, 422, field);
}

function requireBusiness(id: string): Business {
  const business = store.businesses.find((b) => b.id === id);
  if (!business) throw notFound("business", id);
  return business;
}

function requireTechnician(id: string): Technician {
  const technician = store.technicians.find((t) => t.id === id);
  if (!technician) throw notFound("technician", id);
  return technician;
}

// ---------------------------------------------------------------------------
// Expiry
// ---------------------------------------------------------------------------

/**
 * The response window is the backend's to enforce (§6), so the mock enforces
 * it — lazily, on every read and before every intent, rather than on a timer.
 *
 * A timer would keep firing in a test run and in a backgrounded app, and would
 * make results depend on wall-clock scheduling. Checking on access gives the
 * same observable behaviour: nobody can see a `requested` job whose window has
 * closed.
 */
function applyExpiry(now: Date): void {
  for (const job of store.jobs) {
    if (job.status !== "requested" || job.expiresAt === null) continue;
    if (new Date(job.expiresAt).getTime() > now.getTime()) continue;
    const transition = findTransition("requested", "expire");
    if (!transition) continue;
    job.status = transition.to;
    transition.apply?.(job, {
      actor: { role: "customer", id: "system" },
      now,
      settings: store.settings,
      businesses: store.businesses,
      technicians: store.technicians,
      payload: {},
      nextId: store.nextId,
    });
    job.updatedAt = now.toISOString();
  }
}

function findJob(id: string): Job {
  applyExpiry(new Date());
  const job = store.jobs.find((j) => j.id === id);
  if (!job) throw notFound("job", id);
  return job;
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/**
 * Whether this actor is party to this job at all.
 *
 * A technician accepting an open request is the one case where no relationship
 * exists yet, so `accept` is exempt. Everything else requires the caller to own
 * the job: the customer who raised it, or the technician assigned to it. Role
 * alone is not enough — otherwise any technician could complete anyone's job.
 */
function assertOwnership(job: Job, actor: Actor, trigger: JobTrigger): void {
  if (trigger === "accept") {
    // "No lead blasting", the named rule in §6: a request is addressed to the
    // one business the customer chose, not broadcast to whoever claims it
    // first. Without this, a job requested from SecureNow can be accepted by
    // Andy's and the customer gets a provider they did not choose.
    //
    // Whether a dispatcher may cross that line is §11 decision 19, still open.
    if (actor.role === "technician" && job.requestedBusinessId !== null) {
      const technician = store.technicians.find((t) => t.id === actor.id);
      if (technician && technician.businessId !== job.requestedBusinessId) {
        throw new ApiError(
          "not_owner",
          "This request was addressed to another provider.",
          403,
        );
      }
    }
    return;
  }
  if (actor.role === "customer") {
    // The prototype has one customer, so seeded jobs all belong to them.
    if (job.customerName !== SEED_CUSTOMER.name) {
      throw new ApiError("not_owner", "This job belongs to another customer.", 403);
    }
    return;
  }
  if (job.technicianId !== actor.id) {
    throw new ApiError("not_owner", "This job is assigned to another technician.", 403);
  }
}

/**
 * Runs one intent against the machine. The order matters and mirrors what a
 * real backend does: find the job, decide whether the transition exists at all,
 * then whether this caller may cause it.
 *
 * A wrong-state intent is a `409` carrying the job, so the caller can replace
 * its cache with the truth. A wrong-role intent is a `403`, because retrying it
 * with fresher data would not help.
 */
function runIntent(
  id: string,
  trigger: JobTrigger,
  payload: TransitionPayload = {},
): Job {
  const now = new Date();
  const job = findJob(id);
  const actor = store.actor;

  const transition = findTransition(job.status, trigger);
  if (!transition) {
    const legal = triggersFrom(job.status);
    throw new JobConflictError(
      legal.length > 0
        ? `A job that is ${job.status} cannot be ${trigger}ed. Legal from here: ${legal.join(", ")}.`
        : `A job that is ${job.status} is finished and cannot change.`,
      clone(job),
    );
  }

  if (!transition.actors.includes(actor.role)) {
    throw new ApiError(
      "forbidden_actor",
      `A ${actor.role} cannot ${trigger} a job.`,
      403,
    );
  }

  assertOwnership(job, actor, trigger);

  job.status = transition.to;
  transition.apply?.(job, {
    actor,
    now,
    settings: store.settings,
    businesses: store.businesses,
    technicians: store.technicians,
    payload,
    nextId: store.nextId,
  });
  job.updatedAt = now.toISOString();
  return clone(job);
}

/**
 * Replays a write that carries an `Idempotency-Key` we have already seen (§3).
 * Returns the stored result, or null to go ahead.
 */
function replay(options: WriteOptions | undefined): Job | null {
  const key = options?.idempotencyKey;
  if (key === undefined) return null;
  const seen = store.idempotency.get(key);
  return seen ? clone(seen) : null;
}

function remember(options: WriteOptions | undefined, job: Job): Job {
  const key = options?.idempotencyKey;
  if (key !== undefined) store.idempotency.set(key, clone(job));
  return job;
}

// ---------------------------------------------------------------------------
// Job creation
// ---------------------------------------------------------------------------

function responseWindowSeconds(
  urgency: CreateJobInput["urgency"],
  settings: PlatformSettings,
): number | null {
  if (urgency === "emergency") return settings.emergencyResponseSeconds;
  if (urgency === "now") return settings.immediateResponseSeconds;
  // A scheduled job is not racing a countdown.
  return null;
}

function validateCreate(input: CreateJobInput): Business {
  if (!store.categories.some((c) => c.id === input.categoryId)) {
    throw invalid(`Unknown category "${input.categoryId}".`, "categoryId");
  }
  const problem = input.problem.trim();
  if (problem.length < 8) {
    throw invalid("Describe the problem in at least 8 characters.", "problem");
  }
  if (problem.length > 500) {
    throw invalid("Keep the description under 500 characters.", "problem");
  }
  if (input.address.trim().length < 5) {
    throw invalid("Enter a service address.", "address");
  }
  if (input.urgency === "scheduled" && !input.scheduledFor) {
    throw invalid("A scheduled job needs a date.", "scheduledFor");
  }
  const business = requireBusiness(input.requestedBusinessId);
  if (!business.tradeIds.includes(input.categoryId)) {
    throw invalid(
      `${business.name} does not serve ${input.categoryId}.`,
      "requestedBusinessId",
    );
  }
  return business;
}

function buildJob(input: CreateJobInput, business: Business, now: Date): Job {
  const iso = now.toISOString();
  const window = responseWindowSeconds(input.urgency, store.settings);
  return {
    id: store.nextId("job"),
    displayId: `PY-${String(now.getTime()).slice(-6)}`,
    customerName: SEED_CUSTOMER.name,
    customerPhone: SEED_CUSTOMER.phone,
    categoryId: input.categoryId,
    problem: input.problem.trim(),
    urgency: input.urgency,
    scheduledFor: input.scheduledFor ?? null,
    address: input.address.trim(),
    unit: input.unit?.trim() ?? "",
    accessNotes: input.accessNotes?.trim() ?? "",
    status: "requested",
    expiresAt:
      window === null ? null : new Date(now.getTime() + window * 1000).toISOString(),
    requestedBusinessId: business.id,
    businessId: null,
    technicianId: null,
    currency: USD,
    serviceCallFee: business.serviceCallFee,
    estimateItems: [],
    estimateTotal: 0,
    pynaroFee: 0,
    tip: 0,
    paymentStatus: "authorized",
    cardLast4: SEED_CUSTOMER.cardLast4,
    rating: null,
    review: null,
    events: [
      {
        id: store.nextId("ev"),
        at: iso,
        label: "Request created",
        detail: `Card verified •••• ${SEED_CUSTOMER.cardLast4}`,
      },
    ],
    createdAt: iso,
    updatedAt: iso,
  };
}

function validateEstimate(items: readonly EstimateItem[]): void {
  if (items.length === 0) throw invalid("An estimate needs at least one line.", "items");
  if (items.length > 20) throw invalid("An estimate takes at most 20 lines.", "items");
  for (const item of items) {
    if (item.description.trim().length < 2) {
      throw invalid("Every line needs a description.", "items");
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      throw invalid("Quantity must be a whole number from 1 to 99.", "items");
    }
    if (!Number.isInteger(item.unitPrice) || item.unitPrice < 0) {
      throw invalid("Unit price must be a whole number of cents.", "items");
    }
  }
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/** 15 minutes, matching §5's "short-lived access token". */
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

function mintToken(kind: "access" | "refresh", userId: string): string {
  return `mock-${kind}.${userId}.${store.nextId("t")}`;
}

function requireUser(): SessionUser {
  const user = store.userForToken(store.accessToken);
  if (user === null) {
    throw new ApiError("unauthenticated", "Sign in to continue.", 401);
  }
  return user;
}

function authenticate(input: SignInInput): SessionUser {
  const email = input.email.trim().toLowerCase();
  if (email.length === 0) throw invalid("Enter your email address.", "email");
  if (input.password.length === 0) throw invalid("Enter your password.", "password");

  const account = store.accounts.find((candidate) => candidate.email === email);
  // One message for a wrong address and a wrong password, which is the
  // backend's job too: answering them differently tells an attacker which
  // addresses have accounts. A social-only account falls in here as well, for
  // the same reason: saying "that address is Apple-only" is the same leak.
  if (
    account === undefined ||
    account.password === null ||
    account.password !== input.password
  ) {
    throw new ApiError("unauthenticated", "Email or password is incorrect.", 401);
  }
  return account.user;
}

/**
 * Loose on purpose: one `@`, something either side, a dot in the domain. The
 * backend will do better, and anything stricter here rejects addresses that are
 * perfectly valid — which is the usual way an email regex earns a bug report.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** §5's minimum. Sign-in does not enforce it: seeded accounts predate the rule. */
const MIN_PASSWORD_LENGTH = 8;

function register(input: SignUpInput): SessionUser {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();

  // Field order matches the screen's, so the first error a user sees is the
  // first field they could have got wrong rather than the last.
  if (name.length < 2) throw invalid("Enter your full name.", "name");
  if (phone.replace(/\D/g, "").length < 10) {
    throw invalid("Enter a mobile number we can reach you on.", "phone");
  }
  if (!EMAIL_PATTERN.test(email)) throw invalid("Enter a valid email address.", "email");
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw invalid(
      `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
      "password",
    );
  }
  // Checked here and not only in the screen: consent is something the backend
  // has to be able to prove it was given, so it travels on the wire.
  if (!input.acceptedTerms) {
    throw invalid("Accept the Terms and Privacy Policy to continue.", "acceptedTerms");
  }
  if (store.accounts.some((candidate) => candidate.email === email)) {
    // Unlike a failed sign-in, this one has to name the problem: a sign-up form
    // that refused without saying why would be unusable. It is also not much of
    // a leak, since anyone can learn the same thing by trying to register.
    throw invalid("That email already has an account. Log in instead.", "email");
  }

  // Always a customer. §2 rules out the client choosing a role, and a
  // technician account is created by their business in the dashboard.
  const user: SessionUser = {
    id: store.nextId("user"),
    role: "customer",
    name,
    email,
    phone,
    businessId: null,
  };
  store.addAccount({ email, password: input.password, provider: null, user });
  return user;
}

/**
 * A session for `user`, and the adapter adopts it.
 *
 * Shared by all three entry points so they cannot drift: the bug where one of
 * them mints a token but forgets to point the store at it is only reachable if
 * this is written three times.
 */
function issueSession(user: SessionUser): AuthSession {
  const accessToken = mintToken("access", user.id);
  // The adapter adopts the session it just issued, so the very next call is
  // authenticated without the caller having to wire it up. On the HTTP adapter
  // the middleware does this; here the store is the middleware.
  store.setAccessToken(accessToken);
  return {
    accessToken,
    refreshToken: mintToken("refresh", user.id),
    accessTokenExpiresAt: new Date(
      Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000,
    ).toISOString(),
    user: clone(user),
  };
}

// ---------------------------------------------------------------------------
// The adapter
// ---------------------------------------------------------------------------

function paginate(jobs: Job[], params: ListJobsParams | undefined): Page<Job> {
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, params?.limit ?? DEFAULT_PAGE_SIZE));
  const cursor = params?.cursor ?? null;
  const start = cursor === null ? 0 : jobs.findIndex((j) => j.id === cursor) + 1;
  // An unknown cursor would silently restart the list, which reads as duplicate
  // rows in an infinite scroll.
  if (cursor !== null && start === 0) {
    throw invalid("Unknown pagination cursor.", "cursor");
  }
  const page = jobs.slice(start, start + limit);
  const last = page[page.length - 1];
  const more = start + page.length < jobs.length;
  return {
    data: page.map(clone),
    nextCursor: more && last ? last.id : null,
  };
}

export const mockApi: Api = {
  signIn: (input) => withTransport(() => issueSession(authenticate(input))),

  signUp: (input) => withTransport(() => issueSession(register(input))),

  /**
   * No identity token crosses this boundary.
   *
   * The real flow runs the provider SDK inside the HTTP adapter and POSTs what
   * it returns; here the provider name alone picks a seeded account. Either
   * way the screen calls one function and gets a session, which is the only
   * part of this that step 14 must not change.
   */
  signInWithProvider: (provider) =>
    withTransport(() => {
      const account = store.accounts.find((candidate) => candidate.provider === provider);
      if (account === undefined) {
        throw new ApiError(
          "unauthenticated",
          "That sign-in method is not available.",
          401,
        );
      }
      return issueSession(account.user);
    }),

  signOut: () =>
    withTransport(() => {
      // Revoking before clearing, because clearing loses the token to revoke.
      store.revoke(store.accessToken);
      store.setAccessToken(null);
    }),

  getMe: () => withTransport(() => clone(requireUser())),

  // Not a request, so it does not go through `withTransport`: it cannot fail,
  // cannot be slow, and must take effect before the next call rather than
  // after a latency delay.
  setAccessToken: (token) => store.setAccessToken(token),

  listCategories: () => withTransport(() => store.categories.map(clone)),

  listBusinesses: (params) =>
    withTransport(() =>
      store.businesses
        .filter((b) => !params?.categoryId || b.tradeIds.includes(params.categoryId))
        .map(clone),
    ),

  getBusiness: (id) => withTransport(() => clone(requireBusiness(id))),

  listTechnicians: (params) =>
    withTransport(() =>
      store.technicians
        .filter((t) => !params?.businessId || t.businessId === params.businessId)
        .filter((t) => !params?.categoryId || t.tradeIds.includes(params.categoryId))
        .map(clone),
    ),

  getTechnician: (id) => withTransport(() => clone(requireTechnician(id))),

  getSettings: () => withTransport(() => clone(store.settings)),

  listJobs: (params) =>
    withTransport(() => {
      applyExpiry(new Date());
      const wanted = params?.status;
      const jobs = store.jobs
        .filter((job) => !wanted || wanted.includes(job.status))
        // Newest first, the order every list screen wants.
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return paginate(jobs, params);
    }),

  getJob: (id) => withTransport(() => clone(findJob(id))),

  createJob: (input, options) =>
    withTransport(() => {
      const replayed = replay(options);
      if (replayed) return replayed;
      const business = validateCreate(input);
      const job = buildJob(input, business, new Date());
      store.jobs.push(job);
      return remember(options, clone(job));
    }),

  acceptJob: (id) => withTransport(() => runIntent(id, "accept")),
  cancelJob: (id) => withTransport(() => runIntent(id, "cancel")),
  departJob: (id) => withTransport(() => runIntent(id, "depart")),
  arriveJob: (id) => withTransport(() => runIntent(id, "arrive")),

  sendEstimate: (id, items) =>
    withTransport(() => {
      validateEstimate(items);
      return runIntent(id, "estimate", { items });
    }),

  approveEstimate: (id, options) =>
    withTransport(() => {
      const replayed = replay(options);
      if (replayed) return replayed;
      return remember(options, runIntent(id, "approve_estimate"));
    }),

  declineEstimate: (id) => withTransport(() => runIntent(id, "decline_estimate")),
  startJob: (id) => withTransport(() => runIntent(id, "start")),
  completeJob: (id) => withTransport(() => runIntent(id, "complete")),

  payJob: (id, input, options) =>
    withTransport(() => {
      const replayed = replay(options);
      if (replayed) return replayed;
      if (!Number.isInteger(input.tip) || input.tip < 0) {
        throw invalid("Tip must be a whole number of cents.", "tip");
      }
      return remember(options, runIntent(id, "pay", { tip: input.tip }));
    }),
};

export const mockDevControls: DevControls = {
  available: true,
  reset: () => store.reset(),
  setLatency: (latency) => store.setLatency(latency),
  setFailureRate: (rate) => store.setFailureRate(rate),
  failNext: (code: ApiErrorCode = "server_error") => store.failNext(code),
  actAs: (actor) => store.setActor(actor),
  currentActor: () => ({ ...store.actor }),
};

/** Re-exported so tests and the dev screen can name ids without magic strings. */
export { SEED_CUSTOMER } from "./seed";
export type { Category, Cents, EstimateItem, JobStatus, PlatformSettings };
