import { Check } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { borderWidth, colors, radius, spacing } from "@/theme";

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Announced to a screen reader. Required, because the box alone says nothing. */
  label: string;
  /**
   * Rendered beside the box. Left out when the caller only wants the control —
   * the consent row needs styled runs inside its sentence, which is why this
   * takes nodes rather than a string.
   */
  children?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const BOX_SIZE = 20;
const TICK_SIZE = 14;

/**
 * A checkbox, which React Native does not have.
 *
 * `Switch` is the wrong control for consent: a switch is a setting that takes
 * effect as you flip it, and agreeing to terms is neither. The whole row is the
 * hit target, since a 20pt box is under every touch-target guideline there is.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  children,
  disabled = false,
  style,
  testID,
}: CheckboxProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, style]}
    >
      <View
        style={[styles.box, checked && styles.boxChecked, disabled && styles.boxDisabled]}
      >
        {checked ? (
          <Check size={TICK_SIZE} color={colors.onPrimary} strokeWidth={3} />
        ) : null}
      </View>
      {children ? <View style={styles.label}>{children}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowPressed: { opacity: 0.7 },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: borderWidth.thick,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  boxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  boxDisabled: { opacity: 0.5 },
  label: { flex: 1 },
});
