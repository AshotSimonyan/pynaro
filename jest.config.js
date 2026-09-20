/**
 * Domain and API tests run in plain Node: they exercise logic, not components,
 * so the React Native environment would only cost startup time.
 *
 * Component tests from step 8 on need the RN environment instead. Add them as a
 * second project (`preset: "jest-expo/ios"`) rather than switching this one, so
 * the fast tests stay fast.
 */
module.exports = {
  preset: "jest-expo/node",
  // Mirrors the `@/*` alias in tsconfig.json.
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/reference/", "/ios/", "/android/"],
};
