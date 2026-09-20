import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Which group `/` lands in before the session is known. Step 6 replaces this
// with the real gate: hold the native splash while the session hydrates from
// SecureStore, then redirect to (auth), (customer) or (pro).
export const unstable_settings = { anchor: "(auth)" };

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(customer)" />
          <Stack.Screen name="(pro)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
