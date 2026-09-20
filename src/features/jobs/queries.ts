/**
 * Reading jobs.
 *
 * The two rules that matter here are both §4's. The list is cursor-paginated,
 * so it is an infinite query and the cursor lives in the page param rather than
 * the key. The detail polls every 10 s while the job can still move and stops
 * dead at a terminal state — see `jobDetailPollInterval`, which reads the
 * status off the cached job rather than off a flag a screen passes.
 */
import { useInfiniteQuery, useQuery, type InfiniteData } from "@tanstack/react-query";

import { api, keys, type Job, type JobListFilters, type Page } from "@/api";
import { STALE_TIME, jobDetailPollInterval, jobDetailStaleTime } from "@/query";

/**
 * Module scope so the reference is stable: Query re-runs `select` whenever it
 * changes, and an inline arrow changes on every render.
 */
function flattenPages(data: InfiniteData<Page<Job>>): Job[] {
  return data.pages.flatMap((page) => page.data);
}

/**
 * The job list, newest first, flattened across pages.
 *
 * `data` is a plain `Job[]`; `fetchNextPage` and `hasNextPage` come back
 * alongside it for the list to call when it reaches the end.
 */
export function useJobs(filters: JobListFilters = {}) {
  return useInfiniteQuery({
    queryKey: keys.jobs.list(filters),
    queryFn: ({ pageParam }) => api.listJobs({ ...filters, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: STALE_TIME.jobList,
    select: flattenPages,
  });
}

/**
 * One job, polled while it is live.
 *
 * Polling pauses when the app is backgrounded — `refetchIntervalInBackground`
 * is false by default and `app-focus.ts` tells Query when that is — and stops
 * altogether once the job is `paid`, `cancelled` or `expired`.
 *
 * §4 also lists "on push" for this row. That arrives in step 8 as an
 * invalidation of this key from the notification handler; nothing here changes
 * for it.
 */
export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: keys.jobs.detail(id ?? ""),
    queryFn: () => api.getJob(id ?? ""),
    enabled: id !== undefined,
    staleTime: (query) => jobDetailStaleTime(query.state.data),
    refetchInterval: (query) => jobDetailPollInterval(query.state.data),
  });
}
