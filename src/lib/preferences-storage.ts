/**
 * The choices the onboarding setup screen collects, on disk.
 *
 * SecureStore rather than a general key-value store because it is the only
 * persistent storage the app has: §4's approved dependency list has no
 * AsyncStorage and no filesystem module. None of this is secret, so it takes
 * the default accessibility rather than the refresh token's
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` — a preference that could not be read while
 * the device was locked would be a preference the app kept forgetting.
 *
 * One blob rather than three keys, the opposite of `session-storage.ts`, and
 * for the reason that file gives: these values are equally unsensitive, so
 * there is nothing to separate them for.
 */
import * as SecureStore from "expo-secure-store";

const KEY = "pynaro.preferences";

export type Preferences = {
  /**
   * The onboarding toggle only. It is a preference, not a permission: no OS
   * prompt has been shown at this point. Step 10 reads this and asks the system
   * for real once the customer has sent their first request and there is
   * something worth notifying them about.
   */
  notificationsEnabled: boolean;
  /** Prefills the request wizard's address step (step 10). Null until set. */
  serviceAddress: string | null;
};

export const DEFAULT_PREFERENCES: Preferences = {
  notificationsEnabled: true,
  serviceAddress: null,
};

export async function loadPreferences(): Promise<Preferences> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (raw === null) return { ...DEFAULT_PREFERENCES };
    // Spread over the defaults, so a build that adds a key can still read what
    // an older build wrote instead of treating it as corrupt.
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Failures are swallowed, unlike `saveSession`. Losing a notification
 * preference is a small annoyance on the next launch; it is not worth failing
 * the action the user actually asked for, which is finishing onboarding.
 */
export async function savePreferences(preferences: Preferences): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(preferences));
  } catch {
    // Nothing useful to do, and nothing worth blocking the screen for.
  }
}
