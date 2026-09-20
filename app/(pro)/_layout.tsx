import { Redirect, Stack } from "expo-router";

import { SIGNED_OUT_ROUTE, homeForRole, useSession } from "@/features/session";
import { stackScreenOptions } from "@/theme";

/** Requires `role === "technician"`. See the note in the customer layout. */
export default function ProLayout() {
  const session = useSession();
  if (session.status !== "signed-in") return <Redirect href={SIGNED_OUT_ROUTE} />;
  if (session.user.role !== "technician") {
    return <Redirect href={homeForRole(session.user.role)} />;
  }

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
