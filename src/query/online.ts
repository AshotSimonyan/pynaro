/**
 * Bridges `expo-network` into Query's online manager, which §4 of
 * docs/architecture.md asks for so queries resume on reconnect.
 *
 * Query decides "online" from the browser's `online`/`offline` events, which
 * React Native never fires, so without this the manager is permanently online:
 * a request made with no signal fails and burns its retries instead of waiting
 * for the radio to come back.
 *
 * With it wired, `networkMode: "online"` starts doing its job. A query raised
 * while the device is offline is *paused* rather than failed, and runs the
 * moment the connection returns.
 */
import { onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import { useEffect } from "react";

import { isOnline } from "./network-state";

export function useNetworkOnline(): void {
  useEffect(() => {
    // `setEventListener` hands Query a setup function and Query owns its
    // lifecycle: it subscribes when a query first needs to know, and tears the
    // subscription down when the last one goes. So there is nothing for this
    // effect to clean up, and re-running it only replaces the setup.
    onlineManager.setEventListener((setOnline) => {
      // The listener only fires on a change, so the current state has to be
      // read once or the app spends its first moments assuming online.
      Network.getNetworkStateAsync()
        .then((state) => setOnline(isOnline(state)))
        // A platform that cannot answer is not a platform that is offline.
        .catch(() => setOnline(true));

      const subscription = Network.addNetworkStateListener((state) => {
        setOnline(isOnline(state));
      });
      return () => subscription.remove();
    });
  }, []);
}
