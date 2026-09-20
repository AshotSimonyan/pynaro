import { Stack } from "expo-router";

import { stackScreenOptions } from "@/theme";

// Step 6 adds the inverse gate here: redirect out of (auth) if already signed in.
export const unstable_settings = { anchor: "welcome" };

export default function AuthLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
