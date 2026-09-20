import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";

import { borderWidth, colors, radius, spacing, typography } from "@/theme";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  /** Also the accessibility label when `iconOnly` hides the text. */
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconOnly?: boolean;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconOnly = false,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  testID,
}: ButtonProps) {
  const inert = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        iconOnly && iconOnlyStyles[size],
        variantStyles[variant],
        pressed && !inert && pressedStyles[variant],
        fullWidth && styles.fullWidth,
        inert && styles.inert,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={labelColors[variant]} />
      ) : (
        <>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          {iconOnly ? null : (
            <Text
              numberOfLines={1}
              style={[labelSizes[size], { color: labelColors[variant] }]}
            >
              {label}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: borderWidth.hairline,
    borderColor: colors.transparent,
  },
  fullWidth: { alignSelf: "stretch" },
  inert: { opacity: 0.45 },
  icon: { alignItems: "center", justifyContent: "center" },
});

const sizeStyles = StyleSheet.create<Record<ButtonSize, ViewStyle>>({
  sm: { height: 36, paddingHorizontal: spacing.md },
  md: { height: 46, paddingHorizontal: spacing.xl },
  lg: { height: 54, paddingHorizontal: spacing.xxl, borderRadius: radius.lg },
});

/** Square footprint for a button whose icon carries the whole meaning. */
const iconOnlyStyles = StyleSheet.create<Record<ButtonSize, ViewStyle>>({
  sm: { width: 36, paddingHorizontal: 0 },
  md: { width: 46, paddingHorizontal: 0 },
  lg: { width: 54, paddingHorizontal: 0 },
});

const variantStyles = StyleSheet.create<Record<ButtonVariant, ViewStyle>>({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceSunken },
  outline: { backgroundColor: colors.surface, borderColor: colors.border },
  ghost: { backgroundColor: colors.transparent },
  destructive: { backgroundColor: colors.danger },
});

const pressedStyles = StyleSheet.create<Record<ButtonVariant, ViewStyle>>({
  primary: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.border },
  outline: { backgroundColor: colors.surfaceMuted },
  ghost: { backgroundColor: colors.surfaceMuted },
  destructive: { opacity: 0.85 },
});

const labelColors: Record<ButtonVariant, string> = {
  primary: colors.onPrimary,
  secondary: colors.text,
  outline: colors.text,
  ghost: colors.primary,
  destructive: colors.onDanger,
};

const labelSizes = StyleSheet.create<Record<ButtonSize, TextStyle>>({
  sm: { ...typography.label, color: undefined },
  md: { ...typography.bodyStrong, color: undefined },
  lg: { ...typography.bodyStrong, color: undefined, fontSize: 16 },
});
