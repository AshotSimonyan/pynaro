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
]);
