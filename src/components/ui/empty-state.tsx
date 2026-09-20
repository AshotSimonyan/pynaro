import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { borderWidth, colors, radius, spacing, typography } from "@/theme";

export type EmptyStateProps = {
  title: string;
  description?: string;
  /** Sits inside the tinted square above the title. */
  icon?: ReactNode;
  action?: ReactNode;
  /** `compact` is the inline version the prototype uses inside cards. */
  size?: "default" | "compact";
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  size = "default",
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.base, size === "compact" && styles.compact, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xxl,
    borderRadius: radius.xxl,
    borderWidth: borderWidth.hairline,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  compact: { minHeight: 150, padding: spacing.lg },
  icon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
    marginBottom: spacing.xs,
  },
  title: { ...typography.heading, textAlign: "center" },
  description: { ...typography.caption, textAlign: "center" },
  action: { marginTop: spacing.md },
});
