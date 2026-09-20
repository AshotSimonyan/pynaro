// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier/flat");

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ["dist/*", "ios/*", "android/*", "reference/*", ".expo/*"],
  },
  {
    rules: {
      // Nothing above src/api may know which adapter is running.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/api/mock/*", "@/api/http/*", "**/api/mock/*", "**/api/http/*"],
              message:
                "Import from '@/api' only. Screens, hooks and components must not know which adapter is running.",
            },
          ],
        },
      ],
    },
  },
  {
    // The adapters themselves, and the barrel that selects between them.
    files: ["src/api/**"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    // `declare var` is the only form that declares an ambient global; `let` and
    // `const` in a .d.ts do not attach to the global scope the same way. This
    // is not a style choice, so the rule does not apply to declaration files.
    files: ["**/*.d.ts"],
    rules: { "no-var": "off" },
  },
  {
    // Runtime values reach the app through `expo-constants` extra, never
    // `process.env` (§10 of docs/architecture.md). Metro inlines
    // `process.env.EXPO_PUBLIC_*` at build time, so a read here silently bakes
    // in whatever was set on the machine that built the bundle.
    //
    // This became reachable when tsconfig gained `"types": ["node", "jest"]`
    // for the test suite, which made the Node globals visible to app code too.
    files: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "process",
          message:
            "Read config from '@/lib/config', which comes from expo-constants. See §10 of docs/architecture.md.",
        },
      ],
    },
  },
]);
