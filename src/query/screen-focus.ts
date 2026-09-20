/**
 * Screen focus, as opposed to app focus.
 *
 * §4's table says "on focus" for the job list, job detail and earnings, and
 * "while the map screen is focused" for availability. `app-focus.ts` covers the
 * app coming back to the foreground; this file covers navigating back to a
 * screen that never unmounted.
 *
 * That case needs its own answer because Expo Router keeps a screen mounted
 * when you navigate away from it. `refetchOnMount` fires once and never again,
 * so a customer who opens a job, backs out and returns half an hour later would
 * be looking at a half-hour-old job with no request in sight.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

/**
 * On screen focus, refetch every mounted query that is past its staleTime.
 *
 * It takes no arguments on purpose. The hooks own the staleTimes, so they
 * already encode which of §4's rows refetch on focus and which do not: a screen
 * showing the 24 hour catalog next to the 30 second job list calls this once
 * and gets the job list refreshed and the catalog left alone. A screen naming
 * its own keys would be a second place for those rules to live, and the one
 * that drifts.
 *
 * `stale: true` is also what keeps this from being a refetch-on-every-focus
 * hammer, which would make staleTime decorative.
 */
export function useRefetchStaleOnFocus(): void {
  const queryClient = useQueryClient();
  useFocusEffect(
    useCallback(() => {
      void queryClient.refetchQueries({ type: "active", stale: true });
    }, [queryClient]),
  );
}

/**
 * Whether this screen is the focused one.
 *
 * For the polling rows of §4 that are scoped to a screen. The map polls
 * availability every 15 s while it is focused and not at all otherwise, and
 * this is what it passes to say so.
 *
 * Starts true: a screen renders because it is being navigated to, and the
 * focus effect lands in the same commit.
 */
export function useIsScreenFocused(): boolean {
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused;
}
