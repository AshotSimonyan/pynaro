/**
 * The session store: who is signed in, and the one thing the router waits for.
 *
 * §4 puts the session in a client store rather than in Query, and this is why:
 * routing has to be a synchronous read. A gate that had to await a query would
 * render a frame of the wrong group first, which is exactly what §2 forbids.
 *
 * It is also the only owner of the access token. The token itself is not in
 * this state — §5 keeps it in memory, which here means inside the adapter,
 * handed over by `api.setAccessToken`. Nothing else calls that.
 */
import { create } from "zustand";

import { api, isApiError, type AuthSession, type SessionUser } from "@/api";
import { clearSession, loadSession, saveSession } from "@/lib/session-storage";

/**
 * `hydrating` is the state the splash is held for. It is distinct from
 * `signed-out` on purpose: the two look identical to a gate that only asks
 * "is there a user?", and conflating them redirects a signed-in user to the
 * welcome screen for the frame before SecureStore answers.
 */
export type SessionSnapshot =
  | { status: "hydrating"; user: null }
  | { status: "signed-out"; user: null }
  | { status: "signed-in"; user: SessionUser };

/**
 * The snapshot is one field rather than two, so a gate reads a single stable
 * reference. Zustand 5 compares selector results by identity: a selector that
 * built `{ status, user }` on the fly would hand React a new object every time
 * the store was touched, and the discriminated union above would flatten into
 * `user: SessionUser | null` and stop narrowing.
 */
type SessionActions = {
  /** Restore from SecureStore. Safe to call more than once; it runs once. */
  hydrate: () => Promise<void>;
  /** Take a fresh sign-in: persist it, point the adapter at it, go signed-in. */
  adopt: (session: AuthSession) => Promise<void>;
  /** Drop everything local. Does not call the server — `useSignOut` does that. */
  forget: () => Promise<void>;
};

export type SessionStore = { session: SessionSnapshot } & SessionActions;

/**
 * Guards a second `hydrate` from a re-render or a fast refresh. A module-level
 * promise rather than store state because it has to be shared by callers that
 * arrive before the first one has finished writing any state at all.
 */
let hydration: Promise<void> | null = null;

export const useSessionStore = create<SessionStore>()((set) => ({
  session: { status: "hydrating", user: null },

  hydrate: () => {
    hydration ??= (async () => {
      const stored = await loadSession();
      if (stored === null) {
        set({ session: { status: "signed-out", user: null } });
        return;
      }

      // Optimistic, then verified. The stored user is enough to route on
      // immediately, so the app opens where it left off instead of holding the
      // splash for a round trip that a poor connection can make very long.
      api.setAccessToken(stored.accessToken);
      set({ session: { status: "signed-in", user: stored.user } });

      try {
        const user = await api.getMe();
        set({ session: { status: "signed-in", user } });
      } catch (error) {
        // §5: a session the server will not honour is terminal. Anything else
        // — offline, a 500 — is not the server refusing us, and signing out on
        // it would log people out every time they opened the app on a train.
        if (isApiError(error) && error.status === 401) {
          api.setAccessToken(null);
          await clearSession();
          set({ session: { status: "signed-out", user: null } });
        }
      }
    })();
    return hydration;
  },

  adopt: async (session) => {
    // Persist before announcing. A sign-in that reaches the UI but not the
    // keychain is one the next cold start silently undoes.
    await saveSession(session);
    api.setAccessToken(session.accessToken);
    set({ session: { status: "signed-in", user: session.user } });
  },

  forget: async () => {
    api.setAccessToken(null);
    await clearSession();
    set({ session: { status: "signed-out", user: null } });
  },
}));

/** Test-only. Lets a suite start from a cold store without a module reset. */
export function resetSessionHydration(): void {
  hydration = null;
}
