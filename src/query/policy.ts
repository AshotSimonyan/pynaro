/**
 * The freshness and polling rules of §4 of docs/architecture.md, as data and
 * pure functions.
 *
 * They live apart from the hooks for two reasons. The table in the doc gets
 * exactly one expression in code, so a rule cannot be right in one hook and
 * wrong in the next. And the one rule that is conditional — job detail stops
 * polling at a terminal state — becomes testable without mounting React.
 *
 * `policy.test.ts` parses the §4 table out of the Markdown and fails if these
 * numbers and that table disagree.
 */
import { isApiError } from "@/api/errors";
import type { Job } from "@/api/types";
import { isTerminal } from "@/domain/job-transitions";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * TanStack's `StaleTime`. `"static"` is stronger than `Infinity`: an
 * `Infinity` query is never stale but still refetches when something
 * invalidates it, while a static one is never refetched automatically at all.
 */
export type StaleTimePolicy = number | "static";

export const STALE_TIME = {
  catalog: 24 * HOUR,
  platformSettings: 1 * HOUR,
  availability: 15 * SECOND,
  jobList: 30 * SECOND,
  jobDetail: 10 * SECOND,
  /**
   * §4 says "never" for a job that is paid, cancelled or expired, and it has
   * to mean never rather than merely fresh. Every job write invalidates
   * `jobs.all`, so an `Infinity` here would refetch a finished job each time
   * any other job moved. Nothing can change a terminal job, so nothing should
   * go and ask.
   */
  jobDetailTerminal: "static",
  earnings: 5 * MINUTE,
} as const satisfies Record<string, StaleTimePolicy>;

export const POLL_INTERVAL = {
  availability: 15 * SECOND,
  jobDetail: 10 * SECOND,
} as const;

/**
 * How long an unobserved query survives in cache.
 *
 * The default is Query's own five minutes. The catalog gets its staleTime
 * instead: with a five minute `gcTime` a 24 hour staleTime is a lie, because
 * navigating away for six minutes drops the entry and the next screen refetches
 * a catalog that was never going to change.
 */
export const GC_TIME = {
  default: 5 * MINUTE,
  catalog: 24 * HOUR,
  platformSettings: 1 * HOUR,
} as const;

/**
 * §4: job detail is fresh for 10 s while the job is live, and never refetched
 * once it is finished.
 */
export function jobDetailStaleTime(job: Job | undefined): StaleTimePolicy {
  return job !== undefined && isTerminal(job.status)
    ? STALE_TIME.jobDetailTerminal
    : STALE_TIME.jobDetail;
}

/**
 * §4 and §6: poll a job's detail every 10 s while it can still move, and stop
 * at `paid`, `cancelled` or `expired`.
 *
 * Reading the status off the cached job rather than off a flag the screen
 * passes is what makes this reliable. A job that expires under the customer
 * while they watch it stops polling on the tick that reports the expiry, with
 * no screen involved.
 */
export function jobDetailPollInterval(job: Job | undefined): number | false {
  // No data yet means the first fetch is in flight, or it failed. Keep the
  // interval either way: Query will not stack a second fetch on an in-flight
  // one, and this is what recovers a screen whose first load errored.
  if (job === undefined) return POLL_INTERVAL.jobDetail;
  return isTerminal(job.status) ? false : POLL_INTERVAL.jobDetail;
}

export const QUERY_RETRY_LIMIT = 2;

/**
 * Whether trying again could plausibly produce a different answer.
 *
 * A 4xx is a decision, not an accident: the job does not exist, the input is
 * wrong, this role may not do that, the job has moved on. Retrying any of them
 * burns the user's time to arrive at the same refusal, and in the `409` case it
 * throws away the job the error is carrying. Anything that is not an `ApiError`
 * is a bug in our own code, which a retry will reproduce exactly.
 */
export function isRetryable(error: unknown): boolean {
  if (!isApiError(error)) return false;
  return error.status === 0 || error.status >= 500;
}

export function retryQuery(failureCount: number, error: unknown): boolean {
  return failureCount < QUERY_RETRY_LIMIT && isRetryable(error);
}
