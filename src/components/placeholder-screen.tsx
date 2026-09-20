import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, typography } from "@/theme";

import { DevKitLink } from "./dev-kit-link";

/**
 * Step 1 stand-in. Every route in docs/architecture.md §2 exists so the router
 * tree and the group gates are real from the start; the screens themselves
 * arrive in steps 7 to 13. Replaced by real UI, not extended.
 *
 * The `children` slot is the one concession: step 6 needs a way out of a
 * signed-in session before the account and dashboard screens exist, and a real
 * control on a placeholder is better than a second placeholder to delete later.
 */
export function PlaceholderScreen({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      {children}
      <DevKitLink />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  title: { ...typography.heading, color: colors.textMuted },
});
