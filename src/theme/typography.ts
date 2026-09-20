import type { TextStyle } from "react-native";

import { colors } from "./colors";
import { fonts } from "./fonts";

/**
 * Sizes and tracking ported from the prototype: Manrope for display, title and
 * heading, DM Sans for everything else. A face carries its own weight, so these
 * styles set `fontFamily` and never `fontWeight`; setting both makes iOS pick a
 * face the app did not load.
 */
export const typography = {
  display: {
    fontFamily: fonts.display.extrabold,
    fontSize: 28,
    lineHeight: 33,
    letterSpacing: -1,
    color: colors.text,
  },
  title: {
    fontFamily: fonts.display.extrabold,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: -0.6,
    color: colors.text,
  },
  heading: {
    fontFamily: fonts.display.bold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.3,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.sans.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  bodyStrong: {
    fontFamily: fonts.sans.semibold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  label: {
    fontFamily: fonts.sans.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  caption: {
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  /** The prototype's `.eyebrow`: uppercase, tracked out, above a heading. */
  eyebrow: {
    fontFamily: fonts.sans.bold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
