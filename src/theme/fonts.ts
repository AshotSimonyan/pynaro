/**
 * The prototype sets DM Sans for body text and Manrope for headings, so both
 * ship here with only the weights it actually uses. The static faces live in
 * `assets/fonts`; they came from the `@expo-google-fonts` packages, which are
 * not dependencies because the six files are all the app needs.
 *
 * React Native does not synthesise weights: a family name selects exactly one
 * face. So styles name a face and never set `fontWeight` alongside it.
 */
export const fonts = {
  /** DM Sans: body copy, labels and controls. */
  sans: {
    regular: "DMSans_400Regular",
    medium: "DMSans_500Medium",
    semibold: "DMSans_600SemiBold",
    bold: "DMSans_700Bold",
  },
  /** Manrope: the prototype's h1 to h3 rule, tracked tight. */
  display: {
    bold: "Manrope_700Bold",
    extrabold: "Manrope_800ExtraBold",
  },
} as const;

/**
 * Passed to `useFonts` in the root layout. Each key becomes the family name at
 * runtime on both platforms, which is why the keys match `fonts` above.
 */
export const fontAssets = {
  DMSans_400Regular: require("../../assets/fonts/DMSans_400Regular.ttf"),
  DMSans_500Medium: require("../../assets/fonts/DMSans_500Medium.ttf"),
  DMSans_600SemiBold: require("../../assets/fonts/DMSans_600SemiBold.ttf"),
  DMSans_700Bold: require("../../assets/fonts/DMSans_700Bold.ttf"),
  Manrope_700Bold: require("../../assets/fonts/Manrope_700Bold.ttf"),
  Manrope_800ExtraBold: require("../../assets/fonts/Manrope_800ExtraBold.ttf"),
};
