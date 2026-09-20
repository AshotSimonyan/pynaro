import { Redirect, Stack } from "expo-router";

import { SIGNED_OUT_ROUTE, homeForRole, useSession } from "@/features/session";
import { stackScreenOptions } from "@/theme";

/**
 * Requires `role === "customer"`.
 *
 * It repeats the check the root gate already made rather than trusting it,
 * because Expo Router keeps mounted screens alive across redirects (§2): a
 * customer screen that was mounted before a role change would otherwise keep
 * rendering behind the new one. It is also the only gate a deep link straight
 * into `/(customer)/job/123` ever meets.
 */
export default function CustomerLayout() {
  const session = useSession();
  if (session.status !== "signed-in") return <Redirect href={SIGNED_OUT_ROUTE} />;
  if (session.user.role !== "customer") {
    return <Redirect href={homeForRole(session.user.role)} />;
  }

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="request" />
    </Stack>
  );
}
