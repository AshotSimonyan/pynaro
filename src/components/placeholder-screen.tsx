import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing, typography } from "@/theme";

import { DevKitLink } from "./dev-kit-link";

/**
 * Step 1 stand-in. Every route in docs/architecture.md §2 exists so the router
 * tree and the group gates are real from the start; the screens themselves
 * arrive in steps 7 to 13. Replaced by real UI, not extended.
 */
export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>{title}</Text>
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
