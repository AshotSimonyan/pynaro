import { Redirect, Stack } from "expo-router";

import { homeForRole, useSession } from "@/features/session";
import { stackScreenOptions } from "@/theme";

// Where back goes from sign-in, sign-up and the setup screen. Welcome is the
// root of this group's flow, so a deep link into any of the three still leaves
// a way out rather than a stack with nothing under it.
export const unstable_settings = { anchor: "welcome" };

/**
 * The inverse gate: a signed-in user has no business on the sign-in screen, and
 * a deep link to one has to bounce.
 */
export default function AuthLayout() {
  const session = useSession();
  if (session.status === "signed-in") {
    return <Redirect href={homeForRole(session.user.role)} />;
  }
  return <Stack screenOptions={stackScreenOptions} />;
}
