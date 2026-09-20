/**
 * The query layer: the client, its defaults, the §4 rules and the focus
 * bridges React Native needs for "on focus" to mean anything.
 *
 * Feature hooks live in `src/features/*`, not here.
 */
export { useAppStateFocus } from "./app-focus";
export { createQueryClient } from "./client";
export { isOnline, type NetworkStateFields } from "./network-state";
export { useNetworkOnline } from "./online";
export {
  GC_TIME,
  POLL_INTERVAL,
  QUERY_RETRY_LIMIT,
  STALE_TIME,
  isRetryable,
  jobDetailPollInterval,
  jobDetailStaleTime,
  retryQuery,
  type StaleTimePolicy,
} from "./policy";
export { QueryProvider } from "./provider";
export { useIsScreenFocused, useRefetchStaleOnFocus } from "./screen-focus";
