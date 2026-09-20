import Constants from "expo-constants";

/**
 * Runtime values reach the app through `expo-constants` extra, never
 * `process.env` at runtime. See §10 of docs/architecture.md.
 */
type Variant = "development" | "staging" | "production";

const extra: Record<string, unknown> = Constants.expoConfig?.extra ?? {};

/**
 * Expo serialises a `null` in `extra` as `{}`, so an absent value arrives as an
 * empty object rather than null. Anything that is not a non-empty string is
 * absent.
 */
function str(key: string): string | null {
  const value = extra[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

const variant = str("variant");
if (variant !== "development" && variant !== "staging" && variant !== "production") {
  throw new Error(
    `Expo config extra.variant is missing or invalid: ${JSON.stringify(extra["variant"])}. Check app.config.ts.`,
  );
}

export const config = {
  variant: variant satisfies Variant,
  updateChannel: str("updateChannel"),
  /** "mock" runs src/api/mock. "http" is step 14. */
  apiMode: str("apiMode") === "http" ? ("http" as const) : ("mock" as const),
  apiBaseUrl: str("apiBaseUrl"),
  stripePublishableKey: str("stripePublishableKey"),
  sentryDsn: str("sentryDsn"),
};
