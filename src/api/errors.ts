/**
 * One error envelope, from §3 of docs/architecture.md: a stable machine `code`,
 * a human `message`, and an optional `field`. The mock raises exactly what the
 * HTTP adapter will, so error handling written now survives step 14.
 */
import type { Job } from "./types";

export type ApiErrorCode =
  /** No resource with that id. */
  | "not_found"
  /** The input is malformed. `field` names the offender. */
  | "validation_failed"
  /** No session. */
  | "unauthenticated"
  /** The caller's role may never perform this action. */
  | "forbidden_actor"
  /** The right role, but not on this job. */
  | "not_owner"
  /** The action is not legal from the job's current state. */
  | "illegal_transition"
  /** The request never reached the server. */
  | "network_error"
  /** The server failed. */
  | "server_error";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  /** The HTTP status the real backend will answer with. 0 when offline. */
  readonly status: number;
  readonly field: string | null;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    field: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.field = field;
    // Babel may downlevel classes depending on the target, which breaks
    // `instanceof` on Error subclasses unless the prototype is restored.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * A `409`. Carries the job's current state so the caller can replace its cache
 * with the truth instead of refetching (§6). Conflicts are a normal condition:
 * two people acting on one job, or a screen offering a stale affordance.
 */
export class JobConflictError extends ApiError {
  readonly job: Job;

  constructor(message: string, job: Job) {
    super("illegal_transition", message, 409);
    this.name = "JobConflictError";
    this.job = job;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isJobConflictError(error: unknown): error is JobConflictError {
  return error instanceof JobConflictError;
}
