import { Stack } from "expo-router";

import { stackScreenOptions } from "@/theme";

// Step 6 adds the guard: requires role === "customer". Each group layout
// repeats the check rather than trusting the parent, because Expo Router keeps
// mounted screens alive across redirects.
export default function CustomerLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="request" />
    </Stack>
  );
}
