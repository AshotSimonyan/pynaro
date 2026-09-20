import { Stack } from "expo-router";

// Step 6 adds the guard: requires role === "technician".
export default function ProLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="estimate/[jobId]"
        options={{ presentation: "modal", headerShown: true, title: "Estimate" }}
      />
    </Stack>
  );
}
