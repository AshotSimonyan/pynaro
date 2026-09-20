/**
 * The query key factory, from §4 of docs/architecture.md.
 *
 * Every key in the app comes from here, so a cache write and the query it is
 * meant to land on cannot disagree about the shape of a key. A `setQueryData`
 * that misses is silent — the screen simply keeps rendering the old value —
 * which is exactly the bug a factory exists to make impossible.
 *
 * Two conventions:
 *
 * - Every namespace exposes `all`, the prefix that sweeps it. Keys are matched
 *   by prefix, so `invalidateQueries({ queryKey: keys.jobs.all })` reaches
 *   every list and every detail under it.
 * - A list and a detail carry a `"list"` or `"detail"` segment. Without it
 *   `['catalog', 'businesses', x]` would mean a filter object on one call and
 *   an id on the next, and the two would collide the moment an id was also a
 *   valid hash of a filter.
 *
 * Keys are hashed structurally, not by identity, so an inline filter object is
 * safe to pass on every render.
 */
import type { JobStatus } from "./types";

/**
 * What narrows a job list.
 *
 * Deliberately not `ListJobsParams`: `cursor` is the page param of an infinite
 * query and must never reach the key, or every page would land in a cache
 * entry of its own.
 */
export type JobListFilters = {
  status?: readonly JobStatus[];
  limit?: number;
};

export type BusinessFilters = {
  categoryId?: string;
};

/**
 * What narrows live technician availability.
 *
 * §4 writes this key as `availability(near)`. There is no geo filter in the
 * contract yet — the mock serves the whole roster — so the params that exist
 * today are the ones here, and a `near` point joins them without changing the
 * key's shape when the backend grows one.
 */
export type AvailabilityFilters = {
  businessId?: string;
  categoryId?: string;
};

export const keys = {
  jobs: {
    all: ["jobs"] as const,
    lists: () => ["jobs", "list"] as const,
    list: (filters: JobListFilters = {}) => ["jobs", "list", filters] as const,
    details: () => ["jobs", "detail"] as const,
    detail: (id: string) => ["jobs", "detail", id] as const,
  },

  catalog: {
    all: ["catalog"] as const,
    categories: () => ["catalog", "categories"] as const,
    businesses: (filters: BusinessFilters = {}) =>
      ["catalog", "businesses", "list", filters] as const,
    business: (id: string) => ["catalog", "businesses", "detail", id] as const,
  },

  /**
   * Technicians, keyed as availability rather than as catalog because that is
   * what the data is: `status` and `eta` change minute to minute, so the
   * roster and its freshness policy are one thing, not two.
   */
  availability: {
    all: ["availability"] as const,
    list: (filters: AvailabilityFilters = {}) =>
      ["availability", "list", filters] as const,
    detail: (id: string) => ["availability", "detail", id] as const,
  },

  platform: {
    all: ["platform"] as const,
    settings: () => ["platform", "settings"] as const,
  },

  /** Filled in step 6, named here so the session cannot invent a clashing key. */
  session: {
    all: ["session"] as const,
    me: () => ["session", "me"] as const,
  },

  /** Filled in step 12. */
  earnings: {
    all: ["earnings"] as const,
    summary: () => ["earnings", "summary"] as const,
  },
} as const;
