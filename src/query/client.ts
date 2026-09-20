/**
 * The QueryClient and its defaults.
 *
 * What is set here is the floor, and only the floor. Anything §4 of
 * docs/architecture.md names for a particular query — a staleTime, a poll —
 * belongs on the hook that owns that query, so no screen inherits a freshness
 * rule nobody wrote down.
 */
import { QueryClient } from "@tanstack/react-query";

import { GC_TIME, retryQuery } from "./policy";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: GC_TIME.default,
        retry: retryQuery,

        /**
         * Neither means anything on this platform without its bridge:
         * `app-focus.ts` drives the first from `AppState`, `online.ts` drives
         * the second from `expo-network`. Both are mounted by `QueryProvider`.
         */
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,

        /**
         * Errors reach the screen as `error` on the result, not as a throw.
         * §1 puts one error boundary per route group, and a failed job list is
         * not a reason to unmount the group around it — the screen renders its
         * own empty state and a retry (§4: "retry and clear empty states, not
         * a full offline mode").
         */
        throwOnError: false,
      },
      mutations: {
        /**
         * §4: mutations fail loudly rather than queueing. A retried write is a
         * second charge unless the backend dedupes it, and only three of ours
         * carry an `Idempotency-Key`.
         */
        retry: false,
      },
    },
  });
}
