import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { colors, radius } from "@/theme";

export type ProgressTone = "primary" | "success" | "warning" | "danger";

export type ProgressProps = {
  /** 0 to 100, clamped. Matches the prototype's `<Progress value={68} />`. */
  value: number;
  tone?: ProgressTone;
  height?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function Progress({
  value,
  tone = "primary",
  height = 6,
  label,
  style,
}: ProgressProps) {
  const percent = Math.max(0, Math.min(100, value));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      style={[styles.track, { height, borderRadius: height }, style]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${percent}%`,
            borderRadius: height,
            backgroundColor: toneColors[tone],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    alignSelf: "stretch",
    overflow: "hidden",
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.pill,
  },
  fill: { height: "100%" },
});

const toneColors: Record<ProgressTone, string> = {
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};
