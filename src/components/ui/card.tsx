import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { borderWidth, colors, radius, shadows, spacing, typography } from "@/theme";

export type CardVariant = "elevated" | "outlined" | "flat";

export type CardProps = {
  children: ReactNode;
  variant?: CardVariant;
  /** Inner padding. `none` lets a child bleed to the card's edges. */
  padding?: "none" | "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Card({
  children,
  variant = "elevated",
  padding = "md",
  style,
  testID,
}: CardProps) {
  return (
    <View
      testID={testID}
      style={[styles.base, variantStyles[variant], paddingStyles[padding], style]}
    >
      {children}
    </View>
  );
}

export type CardHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  /** Rendered at the trailing edge, vertically centred against the title. */
  action?: ReactNode;
};

export function CardHeader({ title, eyebrow, subtitle, action }: CardHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.transparent,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: { flexShrink: 1, gap: spacing.xxs },
  eyebrow: typography.eyebrow,
  title: typography.heading,
  subtitle: typography.caption,
});

const variantStyles = StyleSheet.create<Record<CardVariant, ViewStyle>>({
  elevated: { borderColor: colors.borderSubtle, ...shadows.sm },
  outlined: { borderColor: colors.border },
  flat: { backgroundColor: colors.surfaceMuted },
});

const paddingStyles = StyleSheet.create({
  none: { padding: 0 },
  sm: { padding: spacing.md },
  md: { padding: spacing.lg },
  lg: { padding: spacing.xxl },
});
