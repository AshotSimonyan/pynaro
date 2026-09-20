import { Button } from "@/components/ui";

import { useSignOut } from "./hooks";

/**
 * Sign out, on its own so the two placeholder screens that need it today can
 * share it.
 *
 * It is here rather than in `src/components/ui` because it is not a primitive:
 * it knows about the session. Steps 8 and 12 fold it into the real account and
 * dashboard screens, and this stays as the one place that owns the action.
 */
export function SignOutButton() {
  const signOut = useSignOut();
  return (
    <Button
      label="Sign out"
      variant="outline"
      onPress={() => signOut.mutate()}
      loading={signOut.isPending}
    />
  );
}
