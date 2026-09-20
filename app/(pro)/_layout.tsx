import { Stack } from "expo-router";

import { stackScreenOptions } from "@/theme";

// Step 6 adds the guard: requires role === "technician".
export default function ProLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="estimate/[jobId]"
        options={{ presentation: "modal", headerShown: true, title: "Estimate" }}
      />
    </Stack>
  );
}
