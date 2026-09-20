/**
 * Signing in and out.
 *
 * Both are mutations rather than store methods so a screen gets `isPending` and
 * `error` for free, and so sign-out can reach the query client — §5 requires
 * the cache to be cleared with the session, and a Zustand store has no business
 * knowing about TanStack Query.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, type AuthSession, type SignInInput } from "@/api";
import { useSessionStore } from "@/stores";

export function useSignIn() {
  const adopt = useSessionStore((state) => state.adopt);
  return useMutation<AuthSession, Error, SignInInput>({
    mutationFn: async (input) => {
      const session = await api.signIn(input);
      // Inside the mutation, not in `onSuccess`: persisting is part of signing
      // in, so a keychain that refuses has to fail the mutation and show the
      // user an error, not leave them signed in until the next cold start.
      await adopt(session);
      return session;
    },
  });
}

export function useSignOut() {
  const forget = useSessionStore((state) => state.forget);
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      try {
        // §5: revoke the refresh token server-side. Best effort — a user who
        // taps sign out on a plane is still signed out.
        await api.signOut();
      } catch {
        // Deliberately swallowed. The local session goes either way.
      }
      await forget();
      // Last, so nothing can refetch into the cache behind a dead token.
      queryClient.clear();
    },
  });
}

/** The current session. Synchronous, which is what the route gates need. */
export function useSession() {
  return useSessionStore((state) => state.session);
}
