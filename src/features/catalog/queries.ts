/**
 * The catalog: trades, providers and the platform's own knobs.
 *
 * All three are slow-moving and read on nearly every screen, so §4 of
 * docs/architecture.md gives them long staleTimes and no polling. "On app
 * start" in that table needs no wiring: nothing is persisted to disk, so an app
 * start is a cold cache and the first render fetches.
 */
import { useQuery } from "@tanstack/react-query";

import { api, keys, type BusinessFilters } from "@/api";
import { GC_TIME, STALE_TIME } from "@/query";

export function useCategories() {
  return useQuery({
    queryKey: keys.catalog.categories(),
    queryFn: () => api.listCategories(),
    staleTime: STALE_TIME.catalog,
    gcTime: GC_TIME.catalog,
  });
}

export function useBusinesses(filters: BusinessFilters = {}) {
  return useQuery({
    queryKey: keys.catalog.businesses(filters),
    queryFn: () => api.listBusinesses(filters),
    staleTime: STALE_TIME.catalog,
    gcTime: GC_TIME.catalog,
  });
}

/**
 * `id` is optional because it usually arrives from a route param, which is
 * typed as a string and is `undefined` for the frame before the router has
 * parsed the URL. Taking it here rather than making every caller guard is the
 * difference between a disabled query and a request for `/businesses/undefined`.
 */
export function useBusiness(id: string | undefined) {
  return useQuery({
    queryKey: keys.catalog.business(id ?? ""),
    queryFn: () => api.getBusiness(id ?? ""),
    enabled: id !== undefined,
    staleTime: STALE_TIME.catalog,
    gcTime: GC_TIME.catalog,
  });
}

/** Fee percent and the response windows. Server-owned; the app never writes them. */
export function usePlatformSettings() {
  return useQuery({
    queryKey: keys.platform.settings(),
    queryFn: () => api.getSettings(),
    staleTime: STALE_TIME.platformSettings,
    gcTime: GC_TIME.platformSettings,
  });
}
