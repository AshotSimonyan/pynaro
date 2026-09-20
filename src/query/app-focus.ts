/**
 * Bridges React Native's `AppState` into Query's focus manager.
 *
 * Query decides "focused" from the browser's `visibilitychange` event, which
 * React Native never fires, so without this bridge the manager stays focused
 * forever. Two things depend on it: `refetchOnWindowFocus`, which is otherwise
 * dead code, and `refetchInterval`, which stops while unfocused and would
 * otherwise keep polling a backgrounded app every ten seconds.
 */
import { focusManager } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

export function useAppStateFocus(): void {
  useEffect(() => {
    // `inactive` is the iOS state during the app switcher and an incoming
    // call. Treating it as unfocused is deliberate: the user is not looking,
    // and returning from it is exactly the moment a refetch is wanted.
    const sync = (status: AppStateStatus): void => {
      focusManager.setFocused(status === "active");
    };
    sync(AppState.currentState);
    const subscription = AppState.addEventListener("change", sync);
    return () => subscription.remove();
  }, []);
}
