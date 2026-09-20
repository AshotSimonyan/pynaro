import { Redirect, Stack } from "expo-router";

import { homeForRole, useSession } from "@/features/session";
import { stackScreenOptions } from "@/theme";

// Sign-in rather than welcome while welcome is still the step 1 placeholder:
// an anchor is where back goes, and backing out to a dead-end screen is worse
// than having no history at all. Step 7 moves this to "welcome".
export const unstable_settings = { anchor: "sign-in" };

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
