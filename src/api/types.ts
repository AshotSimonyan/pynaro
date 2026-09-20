/**
 * The contract, ported from the prototype in step 3.
 *
 * Source of truth for the shapes: `reference/pynaro-mvp/lib/pynaro-data.ts`
 * (catalog), `reference/pynaro-mvp/app/pynaro-app.tsx` (`Job`, `EstimateItem`,
 * `EventItem`) and `reference/pynaro-mvp/db/schema.ts` (the fields the
 * prototype persists but never typed).
 *
 * Until the backend exists this file is the spec, not a transcription of one:
 * step 14 generates the OpenAPI 3.1 document from here and hands it over. From
 * then on §3 of docs/architecture.md applies and types are generated into
 * `schema.d.ts` instead, so the shapes below are written the way a generator
 * would emit them — nullable rather than optional, no helpers, no defaults.
 *
 * Two wire conventions from §3 are applied here rather than inherited from the
 * prototype:
 *
 * - **Money is integer minor units** plus an ISO 4217 `currency`. The
 *   prototype's API divided by 100 on the way out, so its client types are in
 *   dollars and carry rounding error; its SQLite rows are already in cents.
 *   The cents shape is the one that survives.
 * - **Dates are ISO 8601** with offset, UTC on the wire.
 */

/**
 * Integer minor units of the accompanying `currency` — cents for USD. Never a
 * float, never a formatted string; format only at render.
 *
 * This is documentation, not enforcement: it is a plain alias, so TypeScript
 * will not stop dollars being assigned to it. The guard is that no value
 * anywhere in the app is in major units.
 */
export type Cents = number;

/** Whole minutes. */
export type Minutes = number;

/** ISO 8601 with offset, e.g. `2026-09-19T22:04:00Z`. */
export type IsoDateTime = string;

/** ISO 4217, e.g. `USD`. v1 is USD only. */
export type CurrencyCode = string;

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/**
 * A trade. Served by the API with an ETag rather than compiled into the app
 * (§11 decision 10), which is why `icon` and `accent` are data and not theme
 * tokens: the catalog can add a trade without an app release.
 *
 * `icon` is a catalog-owned key the app maps to a local glyph. The prototype's
 * values are lucide names (`droplets`, `snowflake`, …); an unknown key must
 * render a fallback rather than crash.
 */
export type Category = {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Hex, from the catalog. Accent only — never a text or surface color. */
  accent: string;
};

export type Business = {
  id: string;
  name: string;
  /** 0–5, one decimal. */
  rating: number;
  reviewCount: number;
  serviceCallFee: Cents;
  currency: CurrencyCode;
  /** `Category.id[]`. */
  tradeIds: string[];
  /** Hex brand color, from the catalog. */
  color: string;
  verified: boolean;
  insured: boolean;
};

export type TechnicianStatus = "available" | "driving" | "on_job" | "break" | "offline";

export type Technician = {
  id: string;
  businessId: string;
  name: string;
  /** Precomputed by the server; the app must not derive it from `name`. */
  initials: string;
  tradeIds: string[];
  status: TechnicianStatus;
  /**
   * Travel time to the customer. Server-computed via a routing provider
   * (§11 decision 13) — the app renders it and never estimates its own.
   */
  eta: Minutes;
  rating: number;
  jobsCompleted: number;
  skills: string[];
};

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

/**
 * The eleven states of §6 of docs/architecture.md. `paid`, `cancelled` and
 * `expired` are terminal.
 *
 * `expired` is deliberately not folded into `cancelled` (§11 decision 8):
 * nobody chose it, so it reads differently to the customer and counts
 * differently against a technician's response rate.
 */
export type JobStatus =
  | "requested"
  | "accepted"
  | "en_route"
  | "arrived"
  | "estimate_sent"
  | "approved"
  | "in_progress"
  | "completed"
  | "paid"
  | "cancelled"
  | "expired";

/**
 * What the app sends. It never sends a target status — the server owns the
 * machine and decides whether an intent is legal from the current state and
 * the caller's role (§6).
 *
 * Each maps to one endpoint under `/v1/jobs/{id}`:
 *
 * | Intent             | Endpoint                   |
 * | ------------------ | -------------------------- |
 * | `accept`           | `POST .../accept`          |
 * | `cancel`           | `POST .../cancel`          |
 * | `depart`           | `POST .../depart`          |
 * | `arrive`           | `POST .../arrive`          |
 * | `estimate`         | `POST .../estimate`        |
 * | `approve_estimate` | `POST .../estimate/approve`|
 * | `decline_estimate` | `POST .../estimate/decline`|
 * | `start`            | `POST .../start`           |
 * | `complete`         | `POST .../complete`        |
 * | `pay`              | `POST .../pay`             |
 *
 * `complete` is legal from two states — `in_progress`, and `arrived` for a
 * visit that ends without an approved estimate — so the endpoint a screen
 * calls does not identify the state it was called from.
 */
export type JobIntent =
  | "accept"
  | "cancel"
  | "depart"
  | "arrive"
  | "estimate"
  | "approve_estimate"
  | "decline_estimate"
  | "start"
  | "complete"
  | "pay";

/**
 * Server-initiated transitions. Not intents: no client can send one, and there
 * is no endpoint behind them. `expire` is the response timer running out.
 */
export type SystemTrigger = "expire";

/**
 * Everything that can move a job, whoever causes it. The transition table is
 * keyed on this because it describes the whole machine; `JobIntent` alone
 * would leave `expired` unreachable and make the table a liar.
 */
export type JobTrigger = JobIntent | SystemTrigger;

/**
 * Who may trigger a transition. `dispatcher` and `system` never appear in this
 * app — dispatch is the Next.js dashboard, and `system` is the backend
 * expiring an unanswered request — but both are part of the contract the
 * backend implements, so the transition table names them.
 */
export type JobActor = "customer" | "technician" | "dispatcher" | "system";

/** The two roles this app can hold. A session is never a dispatcher. */
export type AppRole = Extract<JobActor, "customer" | "technician">;

export type JobUrgency = "emergency" | "now" | "scheduled";

/**
 * The prototype only ever authorises then pays, so those are the only two
 * states it can produce. Refunds, partial captures and failed charges are real
 * and unmodelled; the backend will extend this.
 */
export type PaymentStatus = "authorized" | "paid";

export type EstimateItem = {
  description: string;
  /** Whole units, 1–99 in the prototype's validation. */
  quantity: number;
  unitPrice: Cents;
};

/** One entry in the job's timeline. Append-only, server-authored. */
export type EventItem = {
  id: string;
  at: IsoDateTime;
  label: string;
  detail: string | null;
};

export type Job = {
  id: string;
  /** Human-facing reference shown in the UI, e.g. `PYN-1042`. */
  displayId: string;

  customerName: string;
  customerPhone: string;

  categoryId: string;
  problem: string;
  urgency: JobUrgency;
  /** Set only when `urgency` is `scheduled`. */
  scheduledFor: IsoDateTime | null;

  address: string;
  /** Apartment or suite. Empty string when there is none, never null. */
  unit: string;
  /** Gate codes, parking, pets. Empty string when there is none. */
  accessNotes: string;

  status: JobStatus;
  /**
   * When an unanswered `requested` job stops being offered. Server-owned: the
   * backend expires the request and emits the transition, and the app only
   * renders the countdown (§6). Null once the job has been answered.
   */
  expiresAt: IsoDateTime | null;

  /** Who the customer asked for. Null on an open request. */
  requestedBusinessId: string | null;
  /** Who took it. Null until `accepted`. */
  businessId: string | null;
  technicianId: string | null;

  currency: CurrencyCode;
  /** Fixed per business, captured onto the job at request time. */
  serviceCallFee: Cents;
  estimateItems: EstimateItem[];
  /**
   * Sum of `estimateItems`. Server-computed; the app never totals it. Zero on
   * a job completed straight from `arrived`, where only the service-call fee
   * and any tip are owed.
   */
  estimateTotal: Cents;
  /** The platform's cut, `feePercent` of the pre-tip total. */
  pynaroFee: Cents;
  tip: Cents;

  paymentStatus: PaymentStatus;
  /** Display only, from the backend. The app never touches card data (§9). */
  cardLast4: string;

  /** 1–5, set by the customer after `completed`. */
  rating: number | null;
  review: string | null;

  events: EventItem[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/**
 * Customer-facing status copy, ported verbatim from the prototype. Keyed by
 * every `JobStatus`, so adding a state is a compile error here.
 *
 * The technician app needs its own wording for several of these — "Estimate
 * ready" reads wrong to the person who just sent it — so this is not the only
 * label map that will exist.
 */
export const statusLabels: Record<JobStatus, string> = {
  requested: "Awaiting response",
  accepted: "Accepted",
  en_route: "Professional en route",
  arrived: "Professional arrived",
  estimate_sent: "Estimate ready",
  approved: "Estimate approved",
  in_progress: "Work in progress",
  completed: "Work completed",
  paid: "Paid & closed",
  cancelled: "Cancelled",
  expired: "No response in time",
};

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------

/** Server-owned knobs. The app reads them and never writes them. */
export type PlatformSettings = {
  /** Whole percent of the pre-tip total kept by the platform. */
  feePercent: number;
  /** Response window for an `emergency` request. */
  emergencyResponseSeconds: number;
  /** Response window for a `now` request. */
  immediateResponseSeconds: number;
  /**
   * Whether a precise technician position is released once a job is accepted.
   * Advertised here, enforced server-side: before acceptance the tracking
   * endpoint returns a grid-snapped point, so the app is never trusted to hide
   * a precise one (§7).
   */
  preciseLocationAfterAcceptance: boolean;
};
