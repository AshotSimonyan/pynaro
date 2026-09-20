import { Link } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { colors, spacing, typography } from "@/theme";

/**
 * Development-only way into the UI kit while the real screens do not exist yet.
 * `__DEV__` is false in release bundles, so this compiles out of production.
 * Goes away with the placeholder screens in steps 7 to 13.
 */
export function DevKitLink() {
  if (!__DEV__) return null;

  return (
    <Link href="/ui-kit" style={styles.link}>
      <Text style={styles.label}>Open the UI kit</Text>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: { padding: spacing.sm },
  label: { ...typography.label, color: colors.primary },
});
