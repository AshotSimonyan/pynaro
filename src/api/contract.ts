/**
 * The interface both adapters implement. This is the seam: everything above
 * `src/api` is written against this type and cannot tell which adapter is
 * running, so step 14 swaps the mock for HTTP by changing `index.ts` alone.
 *
 * Shaped as REST resources, not the prototype's single `action` endpoint —
 * §3 of docs/architecture.md explains why that one does not survive. Each job
 * function below is one intent endpoint from the §6 table; none of them takes a
 * target status.
 */
import type { ApiErrorCode } from "./errors";
import type {
  AppRole,
  Business,
  Category,
  Cents,
  EstimateItem,
  IsoDateTime,
  Job,
  JobStatus,
  JobUrgency,
  PlatformSettings,
  Technician,
} from "./types";

/** Cursor pagination, from §3. `nextCursor` is null on the last page. */
export type Page<T> = {
  data: T[];
  nextCursor: string | null;
};

export type ListJobsParams = {
  /** Restrict to these states. Omitted means all. */
  status?: readonly JobStatus[];
  cursor?: string | null;
  limit?: number;
};

export type CreateJobInput = {
  categoryId: string;
  problem: string;
  urgency: JobUrgency;
  address: string;
  unit?: string;
  accessNotes?: string;
  scheduledFor?: IsoDateTime | null;
  requestedBusinessId: string;
};

/**
 * `Idempotency-Key` from §3. Required by the backend on job creation, estimate
 * approval and payment — the three writes that cost money if repeated.
 */
export type WriteOptions = {
  idempotencyKey?: string;
};

/** Who the adapter believes is calling. Derived from the session, never passed by a screen. */
export type Actor = {
  role: AppRole;
  /** A customer id or a technician id, depending on `role`. */
  id: string;
};

export type Api = {
  // Catalog
  listCategories(): Promise<Category[]>;
  listBusinesses(params?: { categoryId?: string }): Promise<Business[]>;
  getBusiness(id: string): Promise<Business>;
  listTechnicians(params?: {
    businessId?: string;
    categoryId?: string;
  }): Promise<Technician[]>;
  getTechnician(id: string): Promise<Technician>;
  getSettings(): Promise<PlatformSettings>;

  // Jobs
  listJobs(params?: ListJobsParams): Promise<Page<Job>>;
  getJob(id: string): Promise<Job>;
  createJob(input: CreateJobInput, options?: WriteOptions): Promise<Job>;

  // Intents. One per row of the §6 table; the server decides if each is legal.
  acceptJob(id: string): Promise<Job>;
  cancelJob(id: string): Promise<Job>;
  departJob(id: string): Promise<Job>;
  arriveJob(id: string): Promise<Job>;
  sendEstimate(id: string, items: readonly EstimateItem[]): Promise<Job>;
  approveEstimate(id: string, options?: WriteOptions): Promise<Job>;
  declineEstimate(id: string): Promise<Job>;
  startJob(id: string): Promise<Job>;
  completeJob(id: string): Promise<Job>;
  payJob(id: string, input: { tip: Cents }, options?: WriteOptions): Promise<Job>;
};

export type LatencyRange = { min: number; max: number };

/**
 * Dev-only levers on the running adapter: latency, forced failures and who is
 * acting. Exposed through `@/api` rather than from the mock directly, so a dev
 * screen can drive it without importing an adapter and breaking the rule that
 * nothing above `src/api` knows which one is running.
 *
 * `available` is false on the HTTP adapter, where every method is a no-op.
 */
export type DevControls = {
  readonly available: boolean;
  /** Restore seed data, default latency, no forced failures, the seed actor. */
  reset(): void;
  setLatency(latency: LatencyRange | number): void;
  /** 0 to 1. Each call rolls against it independently. */
  setFailureRate(rate: number): void;
  /** Fail the next call only, then clear. */
  failNext(code?: ApiErrorCode): void;
  actAs(actor: Actor): void;
  currentActor(): Actor;
};
