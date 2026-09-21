import { Redirect } from "expo-router";

import { SIGNED_OUT_ROUTE } from "@/features/session";

/**
 * Where `/` lands while signed out.
 *
 * `Stack.Protected` leaves only one group mounted, and each group answers `/`
 * with its own index — `(customer)/(tabs)` and `(pro)/(tabs)` already do. This
 * is `(auth)`'s, and it exists because the auth screens are all named routes
 * with no index among them.
 */
export default function AuthIndex() {
  return <Redirect href={SIGNED_OUT_ROUTE} />;
}
