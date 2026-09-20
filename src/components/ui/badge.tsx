import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";

import { borderWidth, colors, fonts, radius, spacing, typography } from "@/theme";

export type BadgeVariant =
  "primary" | "secondary" | "outline" | "success" | "warning" | "destructive";

export type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  /** Leading status dot, as on the prototype's "Live" and availability badges. */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Badge({
  label,
  variant = "primary",
  size = "md",
  dot = false,
  style,
}: BadgeProps) {
  return (
    <View style={[styles.base, sizeStyles[size], variantStyles[variant], style]}>
      {dot ? (
        <View style={[styles.dot, { backgroundColor: textColors[variant] }]} />
      ) : null}
      <Text numberOfLines={1} style={[labelSizes[size], { color: textColors[variant] }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: borderWidth.hairline,
    borderColor: colors.transparent,
  },
  dot: { width: 6, height: 6, borderRadius: radius.pill },
});

const sizeStyles = StyleSheet.create({
  sm: { height: 20, paddingHorizontal: spacing.sm },
  md: { height: 26, paddingHorizontal: spacing.md },
});

const labelSizes = StyleSheet.create<Record<"sm" | "md", TextStyle>>({
  sm: {
    fontFamily: fonts.sans.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  md: { ...typography.label, color: undefined, letterSpacing: 0.2 },
});

const variantStyles = StyleSheet.create<Record<BadgeVariant, ViewStyle>>({
  primary: { backgroundColor: colors.primaryMuted },
  secondary: { backgroundColor: colors.surfaceSunken },
  outline: { backgroundColor: colors.surface, borderColor: colors.border },
  success: { backgroundColor: colors.successMuted },
  warning: { backgroundColor: colors.warningMuted },
  destructive: { backgroundColor: colors.dangerMuted },
});

const textColors: Record<BadgeVariant, string> = {
  primary: colors.primary,
  secondary: colors.textSubtle,
  outline: colors.textSubtle,
  success: colors.success,
  warning: colors.warning,
  destructive: colors.danger,
};
