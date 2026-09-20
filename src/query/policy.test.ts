/**
 * The query layer's rules, checked against §4 of docs/architecture.md and
 * against the state machine.
 *
 * These run in plain Node because everything under test is a pure function.
 * That is the reason the rules live in `policy.ts` rather than inline in the
 * hooks: "polling stops on terminal job states" is provable here, for every
 * state, without a renderer.
 */
// Imported from the modules rather than the `@/api` barrel: the barrel selects
// an adapter and reads the Expo config to do it, which a pure-logic test in
// Node has no reason to load.
import { ApiError, JobConflictError, type ApiErrorCode } from "@/api/errors";
import type { Job, JobStatus } from "@/api/types";
import { JOB_TRANSITIONS, TERMINAL_STATUSES } from "@/domain/job-transitions";
import { documentedFreshness } from "@/test-support/section-4";

import {
  GC_TIME,
  POLL_INTERVAL,
  QUERY_RETRY_LIMIT,
  STALE_TIME,
  isRetryable,
  jobDetailPollInterval,
  jobDetailStaleTime,
  retryQuery,
} from "./policy";

const ALL_STATUSES: JobStatus[] = [
  "requested",
  "accepted",
  "en_route",
  "arrived",
  "estimate_sent",
  "approved",
  "in_progress",
  "completed",
  "paid",
  "cancelled",
  "expired",
];

function jobWith(status: JobStatus): Job {
  return { id: "job_1", status } as Job;
}

function freshnessFor(query: string) {
  const row = documentedFreshness().find((entry) => entry.query === query);
  if (row === undefined) throw new Error(`§4 has no row named "${query}"`);
  return row;
}

describe("the §4 table and src/query/policy.ts agree", () => {
  // If this fails, §4 grew or lost a row and the map below has not caught up.
  it("covers every documented row", () => {
    expect(documentedFreshness().map((row) => row.query)).toEqual([
      "Categories, businesses",
      "Platform settings",
      "Nearby availability",
      "Job list",
      "Job detail, active",
      "Job detail, paid or cancelled",
      "Earnings",
    ]);
  });

  it.each([
    ["Categories, businesses", STALE_TIME.catalog],
    ["Platform settings", STALE_TIME.platformSettings],
    ["Nearby availability", STALE_TIME.availability],
    ["Job list", STALE_TIME.jobList],
    ["Job detail, active", STALE_TIME.jobDetail],
    ["Job detail, paid or cancelled", STALE_TIME.jobDetailTerminal],
    ["Earnings", STALE_TIME.earnings],
  ])("%s has the documented staleTime", (query, policy) => {
    // Compared literally, not through a common unit. The terminal row says
    // `"static"` in both places precisely so that `Infinity` — which is not the
    // same thing — cannot be written into either and still pass.
    expect(policy).toBe(freshnessFor(query).staleTime);
  });

  it.each([
    ["Nearby availability", POLL_INTERVAL.availability],
    ["Job detail, active", POLL_INTERVAL.jobDetail],
  ])("%s polls at the documented interval", (query, interval) => {
    expect(freshnessFor(query).pollInterval).toBe(interval);
  });

  it("polls nothing the doc does not ask to be polled", () => {
    const polled = documentedFreshness()
      .filter((row) => row.pollInterval !== null)
      .map((row) => row.query);
    expect(polled).toEqual(["Nearby availability", "Job detail, active"]);
    expect(Object.keys(POLL_INTERVAL)).toHaveLength(polled.length);
  });

  it("keeps the catalog in cache for as long as it claims to be fresh", () => {
    // A gcTime shorter than the staleTime makes the staleTime decorative: the
    // entry is evicted while unobserved and the next screen refetches anyway.
    expect(GC_TIME.catalog).toBeGreaterThanOrEqual(STALE_TIME.catalog);
    expect(GC_TIME.platformSettings).toBeGreaterThanOrEqual(STALE_TIME.platformSettings);
  });
});

describe("job detail polling", () => {
  it("stops on exactly the terminal states", () => {
    const stopped = ALL_STATUSES.filter(
      (status) => jobDetailPollInterval(jobWith(status)) === false,
    );
    expect(stopped.sort()).toEqual([...TERMINAL_STATUSES].sort());
  });

  it("polls every live state at 10 s", () => {
    const live = ALL_STATUSES.filter(
      (status) => !(TERMINAL_STATUSES as readonly JobStatus[]).includes(status),
    );
    for (const status of live) {
      expect(jobDetailPollInterval(jobWith(status))).toBe(POLL_INTERVAL.jobDetail);
    }
  });

  it("keeps polling when there is no job yet, so a failed first load recovers", () => {
    expect(jobDetailPollInterval(undefined)).toBe(POLL_INTERVAL.jobDetail);
  });

  it("stops at every state the machine can end in", () => {
    // Derived from the transition table rather than from TERMINAL_STATUSES, so
    // a new state with no outgoing row cannot quietly keep a poll running.
    const withOutgoing = new Set(JOB_TRANSITIONS.map((t) => t.from));
    const reachable = new Set(JOB_TRANSITIONS.map((t) => t.to));
    for (const status of reachable) {
      if (withOutgoing.has(status)) continue;
      expect(jobDetailPollInterval(jobWith(status))).toBe(false);
    }
  });
});

describe("job detail staleTime", () => {
  it("is never refetched once terminal", () => {
    for (const status of TERMINAL_STATUSES) {
      expect(jobDetailStaleTime(jobWith(status))).toBe("static");
    }
  });

  it("is 10 s while the job can still move", () => {
    expect(jobDetailStaleTime(jobWith("en_route"))).toBe(STALE_TIME.jobDetail);
    expect(jobDetailStaleTime(undefined)).toBe(STALE_TIME.jobDetail);
  });
});

describe("retry", () => {
  const codes: [ApiErrorCode, number][] = [
    ["not_found", 404],
    ["validation_failed", 422],
    ["unauthenticated", 401],
    ["forbidden_actor", 403],
    ["not_owner", 403],
  ];

  it.each(codes)("does not retry %s", (code, status) => {
    expect(isRetryable(new ApiError(code, "no", status))).toBe(false);
  });

  it("does not retry a conflict, which carries the answer already", () => {
    const conflict = new JobConflictError("moved on", jobWith("paid"));
    expect(isRetryable(conflict)).toBe(false);
  });

  it("retries a server error and an offline request", () => {
    expect(isRetryable(new ApiError("server_error", "boom", 500))).toBe(true);
    expect(isRetryable(new ApiError("network_error", "offline", 0))).toBe(true);
  });

  it("does not retry an error of our own making", () => {
    expect(isRetryable(new TypeError("undefined is not a function"))).toBe(false);
  });

  it("gives up after the limit", () => {
    const error = new ApiError("server_error", "boom", 500);
    expect(retryQuery(QUERY_RETRY_LIMIT - 1, error)).toBe(true);
    expect(retryQuery(QUERY_RETRY_LIMIT, error)).toBe(false);
  });
});
