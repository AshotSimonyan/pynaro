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
import { colors, fontAssets, stackScreenOptions } from "@/theme";

// Which group `/` lands in before the session is known. Step 6 replaces this
// with the real gate: hold the native splash while the session hydrates from
// SecureStore, then redirect to (auth), (customer) or (pro).
export const unstable_settings = { anchor: "(auth)" };

// The splash stays up until the fonts are ready, so no screen renders in the
// fallback face first. Step 6 extends the same hold to the session.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, which happens on a fast refresh. Nothing to recover.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {
        // Same as above: the splash may already be gone.
      });
    }
  }, [ready]);

  // A font that fails to load is not worth a stuck splash: `fontError` lets the
  // app through on the platform face rather than holding the user at the logo.
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={stackScreenOptions}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(customer)" />
              <Stack.Screen name="(pro)" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </ToastProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
