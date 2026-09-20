import { Platform, Switch as RNSwitch } from "react-native";
import type { SwitchProps as RNSwitchProps } from "react-native";

import { colors } from "@/theme";

export type SwitchProps = Omit<RNSwitchProps, "trackColor" | "thumbColor"> & {
  label?: string;
};

/**
 * The platform switch in brand colours. Android tints the thumb, iOS does not,
 * so the thumb colour is set per platform rather than unconditionally.
 */
export function Switch({ label, value, disabled, ...rest }: SwitchProps) {
  return (
    <RNSwitch
      value={value}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityState={{ checked: value === true, disabled: disabled === true }}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={Platform.OS === "android" ? colors.surface : undefined}
      ios_backgroundColor={colors.border}
      {...rest}
    />
  );
}
