import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";

import { Input } from "./input";
import type { InputProps } from "./input";

export type TextareaProps = Omit<InputProps, "multiline"> & {
  /** Visible height in lines before the field scrolls. */
  rows?: number;
  /** Shows `used / maxLength` under the field. Needs `maxLength`. */
  showCount?: boolean;
};

export function Textarea({
  rows = 4,
  showCount = false,
  maxLength,
  value,
  hint,
  error,
  containerStyle,
  fieldStyle,
  ...rest
}: TextareaProps) {
  const counter =
    showCount && maxLength !== undefined ? `${value?.length ?? 0} / ${maxLength}` : null;

  return (
    <View style={[styles.container, containerStyle]}>
      <Input
        multiline
        maxLength={maxLength}
        value={value}
        hint={counter ? undefined : hint}
        error={error}
        fieldStyle={[{ minHeight: rows * 22 + spacing.lg }, fieldStyle]}
        {...rest}
      />
      {counter ? (
        <View style={styles.footer}>
          <Text style={[styles.hint, error ? styles.hintHidden : null]}>
            {hint ?? ""}
          </Text>
          <Text style={styles.counter}>{counter}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  footer: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  hint: { ...typography.caption, flexShrink: 1 },
  hintHidden: { opacity: 0 },
  counter: { ...typography.caption, color: colors.textDisabled },
});
