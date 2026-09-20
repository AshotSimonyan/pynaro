/**
 * The session on disk, per §5 of docs/architecture.md.
 *
 * Three items rather than one blob, because they are not equally sensitive and
 * §5 gives them different rules. The refresh token is the long-lived
 * credential, so it gets `WHEN_UNLOCKED_THIS_DEVICE_ONLY`: not readable while
 * the device is locked, and never carried to a new device by a backup or an
 * iCloud restore. One blob would force the whole session down to whichever
 * accessibility setting the weakest item could tolerate.
 *
 * Nothing here logs a token, and nothing here should ever be asked to.
 */
import * as SecureStore from "expo-secure-store";

import type { AuthSession, SessionUser } from "@/api";

const ACCESS_TOKEN_KEY = "pynaro.session.accessToken";
const REFRESH_TOKEN_KEY = "pynaro.session.refreshToken";
const USER_KEY = "pynaro.session.user";

/**
 * §5: the refresh token "lives only in SecureStore,
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY`".
 */
const REFRESH_TOKEN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/** What a cold start restores. The tokens plus who they belong to. */
export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

/**
 * A read that fails is a session that is not there.
 *
 * SecureStore throws rather than returning null when the keychain is
 * unavailable, the item is corrupt, or the platform has no secure storage at
 * all. None of those are worth crashing a cold start over, and all of them mean
 * the same thing to the caller: sign in again.
 */
async function read(key: string, options?: SecureStore.SecureStoreOptions) {
  try {
    return await SecureStore.getItemAsync(key, options);
  } catch {
    return null;
  }
}

export async function loadSession(): Promise<StoredSession | null> {
  const [accessToken, refreshToken, rawUser] = await Promise.all([
    read(ACCESS_TOKEN_KEY),
    read(REFRESH_TOKEN_KEY, REFRESH_TOKEN_OPTIONS),
    read(USER_KEY),
  ]);
  if (accessToken === null || refreshToken === null || rawUser === null) return null;

  try {
    // Parsed, not validated. The shape came from this app on this device, and
    // the version that wrote it is the version reading it — until an app update
    // changes `SessionUser`, which is what the catch is for.
    return { accessToken, refreshToken, user: JSON.parse(rawUser) as SessionUser };
  } catch {
    return null;
  }
}

/**
 * Write failures propagate. A sign-in that cannot be persisted has half
 * succeeded, and the user should find that out now rather than at the next cold
 * start when they are silently signed out again.
 */
export async function saveSession(session: AuthSession): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken),
    SecureStore.setItemAsync(
      REFRESH_TOKEN_KEY,
      session.refreshToken,
      REFRESH_TOKEN_OPTIONS,
    ),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user)),
  ]);
}

/**
 * Clearing swallows failures, for the opposite reason to saving. Sign-out has
 * to end in a signed-out app whatever the keychain says, so a failure here must
 * not leave the user looking at a screen they asked to leave.
 */
export async function clearSession(): Promise<void> {
  await Promise.all([
    forget(ACCESS_TOKEN_KEY),
    forget(REFRESH_TOKEN_KEY, REFRESH_TOKEN_OPTIONS),
    forget(USER_KEY),
  ]);
}

async function forget(key: string, options?: SecureStore.SecureStoreOptions) {
  try {
    await SecureStore.deleteItemAsync(key, options);
  } catch {
    // Nothing useful to do, and nothing worth blocking sign-out for.
  }
}
