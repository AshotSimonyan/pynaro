import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastProvider } from "@/components/ui";
import { QueryProvider } from "@/query";
import { useSessionStore } from "@/stores";
import { colors, fontAssets, stackScreenOptions } from "@/theme";

// No `unstable_settings.anchor` here. An anchor names one route as the tree's
// base, and which group that should be changes with the session — an anchor of
// `(auth)` is a route a signed-in user does not have. `Stack.Protected` below
// leaves exactly one group mounted instead, so `/` resolves into it without
// anyone naming it.

// The splash stays up until the fonts are ready and the session has hydrated,
// so no screen renders in the fallback face and no group renders before the
// router knows which one it should be (§2).
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, which happens on a fast refresh. Nothing to recover.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const hydrate = useSessionStore((state) => state.hydrate);
  const session = useSessionStore((state) => state.session);
  const sessionStatus = session.status;
  const role = session.status === "signed-in" ? session.user.role : null;

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const ready = (fontsLoaded || fontError !== null) && sessionStatus !== "hydrating";

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {
        // Same as above: the splash may already be gone.
      });
    }
  }, [ready]);

  // A font that fails to load is not worth a stuck splash: `fontError` lets the
  // app through on the platform face rather than holding the user at the logo.
  // A session that cannot be read resolves to signed-out, so `hydrating` always
  // ends and this is never the last word.
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {/* Above the gates below it, so signing out can clear the cache (§5)
            without the provider unmounting first. */}
        <QueryProvider>
          <BottomSheetModalProvider>
            <ToastProvider>
              <StatusBar style="dark" />
              {/* §2's gate: done by removal rather than by redirect. A
                  guarded-off group is not in the navigation state at all, so a
                  deep link into the wrong one cannot render even for a frame —
                  there is no frame to render. Each group layout repeats its own
                  check underneath this as the second line. */}
              <Stack screenOptions={stackScreenOptions}>
                <Stack.Protected guard={sessionStatus === "signed-out"}>
                  <Stack.Screen name="(auth)" />
                </Stack.Protected>
                <Stack.Protected guard={role === "customer"}>
                  <Stack.Screen name="(customer)" />
                </Stack.Protected>
                <Stack.Protected guard={role === "technician"}>
                  <Stack.Screen name="(pro)" />
                </Stack.Protected>
                <Stack.Screen name="+not-found" />
              </Stack>
            </ToastProvider>
          </BottomSheetModalProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
