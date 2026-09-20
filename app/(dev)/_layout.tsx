import { Redirect, Stack } from "expo-router";

import { stackScreenOptions } from "@/theme";

/**
 * Development-only group. It holds the UI kit and nothing that ships, so in a
 * release bundle every route under it redirects home. `__DEV__` is false there,
 * which also lets the bundler drop the screens.
 */
export default function DevLayout() {
  if (!__DEV__) return <Redirect href="/" />;

  return <Stack screenOptions={{ ...stackScreenOptions, headerShown: true }} />;
}
