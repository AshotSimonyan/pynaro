/**
 * Live technician availability: who is free, and how far away.
 *
 * Separate from the catalog although it comes off the same resource, because
 * `status` and `eta` change minute to minute while a provider's name does not.
 * §4 gives it a 15 s staleTime and a 15 s poll scoped to the map screen.
 */
import { useQuery } from "@tanstack/react-query";

import { api, keys, type AvailabilityFilters } from "@/api";
import { POLL_INTERVAL, STALE_TIME } from "@/query";

export type AvailabilityOptions = {
  /**
   * Poll every 15 s. §4 scopes this to the map screen while it is focused, so
   * the screen passes `useIsScreenFocused()` rather than a literal `true` —
   * screen focus is a navigation fact, and the hook has no business guessing
   * it. App backgrounding is handled a level down, by the AppState bridge.
   */
  poll?: boolean;
};

export function useAvailability(
  filters: AvailabilityFilters = {},
  options: AvailabilityOptions = {},
) {
  return useQuery({
    queryKey: keys.availability.list(filters),
    queryFn: () => api.listTechnicians(filters),
    staleTime: STALE_TIME.availability,
    refetchInterval: options.poll === true ? POLL_INTERVAL.availability : false,
  });
}

export function useTechnician(id: string | undefined) {
  return useQuery({
    queryKey: keys.availability.detail(id ?? ""),
    queryFn: () => api.getTechnician(id ?? ""),
    enabled: id !== undefined,
    staleTime: STALE_TIME.availability,
  });
}
