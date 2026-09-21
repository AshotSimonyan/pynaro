import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing } from "@/theme";

import { PynaroMark } from "./pynaro-mark";

/**
 * Mark, name and tagline as one lockup, matching the prototype's
 * `.welcome-brand`.
 *
 * The sizes here are the brand's rather than the type scale's — 44pt is not a
 * step in `typography` and should not become one, because nothing but the
 * wordmark will ever want it. Everything that is a token still comes from the
 * theme.
 */
export type WordmarkProps = {
  /** Height of the pin above the name. */
  markHeight?: number;
};

export function Wordmark({ markHeight = 115 }: WordmarkProps) {
  return (
    <View style={styles.root}>
      <PynaroMark height={markHeight} />
      {/* The mark already carries the label, so the two lines below would
          otherwise be read out a second time, letter-spaced. */}
      <Text
        style={styles.name}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        PYNARO
      </Text>
      <Text
        style={styles.tagline}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        THE RIGHT PRO. RIGHT NEARBY.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center" },
  name: {
    marginTop: spacing.sm,
    fontFamily: fonts.display.extrabold,
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: 2.2,
    color: colors.text,
  },
  tagline: {
    marginTop: spacing.md,
    fontFamily: fonts.sans.bold,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 0.65,
    color: colors.primary,
  },
});
