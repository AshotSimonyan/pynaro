import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Three build variants, selected by APP_VARIANT. Section 10 of
 * docs/architecture.md owns this table; keep them in sync.
 *
 *   APP_VARIANT=development pnpm prebuild
 *   APP_VARIANT=staging eas build --profile staging
 */
type Variant = "development" | "staging" | "production";

type VariantConfig = {
  name: string;
  bundleId: string;
  scheme: string;
  updateChannel: string | null;
};

const VARIANTS: Record<Variant, VariantConfig> = {
  development: {
    name: "Pynaro Dev",
    bundleId: "co.pynaro.app.dev",
    scheme: "pynaro-dev",
    updateChannel: null,
  },
  staging: {
    name: "Pynaro Staging",
    bundleId: "co.pynaro.app.staging",
    scheme: "pynaro-staging",
    updateChannel: "staging",
  },
  production: {
    name: "Pynaro",
    bundleId: "co.pynaro.app",
    scheme: "pynaro",
    updateChannel: "production",
  },
};

function resolveVariant(): Variant {
  const value = process.env.APP_VARIANT ?? "development";
  if (value in VARIANTS) return value as Variant;
  throw new Error(
    `APP_VARIANT must be one of ${Object.keys(VARIANTS).join(", ")}, got "${value}".`,
  );
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant();
  const { name, bundleId, scheme, updateChannel } = VARIANTS[variant];

  return {
    ...config,
    name,
    slug: "pynaro",
    version: "0.1.0",
    orientation: "portrait",
    scheme,
    userInterfaceStyle: "light",
    icon: "./assets/images/icon.png",
    // The New Architecture is the only architecture from SDK 55 on, so there is
    // no `newArchEnabled` flag to set. Likewise Android edge-to-edge.
    ios: {
      bundleIdentifier: bundleId,
      supportsTablet: false,
    },
    android: {
      package: bundleId,
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 180,
          resizeMode: "contain",
          backgroundColor: "#f3f6fb",
        },
      ],
      // When-in-use only. §7 of docs/architecture.md puts the "Always"
      // request at the technician's first job acceptance, behind a screen that
      // explains it, so background location and the Android foreground service
      // are turned on in step 12 rather than here. Asking for Always at
      // onboarding is also the shape App Review rejects.
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Pynaro uses your location to show nearby professionals and accurate arrival times.",
          // `false` removes each key rather than leaving the plugin's
          // boilerplate "Allow Pynaro to access your location" in Info.plist.
          // Nothing requests Always yet, and an unused usage string is one App
          // Review reads and asks about. Step 12 writes the real ones.
          //
          // Both keys, not one: the plugin writes the modern
          // `NSLocationAlwaysAndWhenInUseUsageDescription` and the deprecated
          // `NSLocationAlwaysUsageDescription` from separate options, so
          // silencing only the first leaves the boilerplate in the build.
          locationAlwaysAndWhenInUsePermission: false,
          locationAlwaysPermission: false,
        },
      ],
      // Temporary: adopts the UIScene life cycle that the iOS 27 SDK requires.
      // Remove once Expo ships scene support. See docs/ios-scene-delegate.md.
      "./plugins/with-ios-scene-delegate",
    ],
    experiments: {
      typedRoutes: true,
    },
    // `runtimeVersion` follows the native fingerprint: a native dependency
    // change moves it and therefore requires a new build, not an update.
    runtimeVersion: { policy: "fingerprint" },
    extra: {
      variant,
      updateChannel,
      // Only these three values ship in the bundle. Read them through
      // `expo-constants`, never `process.env` at runtime.
      apiMode: process.env.EXPO_PUBLIC_API_MODE ?? "mock",
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? null,
      stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? null,
    },
  };
};
