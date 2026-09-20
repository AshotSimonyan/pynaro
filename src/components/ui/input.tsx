import { useState } from "react";
import type { ReactNode, Ref } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { StyleProp, TextInputProps, ViewStyle } from "react-native";

import { borderWidth, colors, radius, spacing, typography } from "@/theme";

export type InputProps = Omit<TextInputProps, "style"> & {
  label?: string;
  /** Helper text under the field. Replaced by `error` when the field is invalid. */
  hint?: string;
  error?: string;
  left?: ReactNode;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  /** Applied to the bordered box, not to the text input inside it. */
  fieldStyle?: StyleProp<ViewStyle>;
  ref?: Ref<TextInput>;
};

export function Input({
  label,
  hint,
  error,
  left,
  right,
  containerStyle,
  fieldStyle,
  onFocus,
  onBlur,
  editable = true,
  multiline = false,
  ref,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          focused && styles.fieldFocused,
          error ? styles.fieldInvalid : null,
          !editable && styles.fieldDisabled,
          fieldStyle,
        ]}
      >
        {left ? <View style={styles.accessory}>{left}</View> : null}
        <TextInput
          ref={ref}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={colors.textDisabled}
          selectionColor={colors.primary}
          accessibilityLabel={label}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, multiline && styles.inputMultiline]}
          {...rest}
        />
        {right ? <View style={styles.accessory}>{right}</View> : null}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: typography.label,
  field: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fieldMultiline: { alignItems: "flex-start", paddingVertical: spacing.xs },
  fieldFocused: { borderColor: colors.primary },
  fieldInvalid: { borderColor: colors.danger },
  fieldDisabled: { backgroundColor: colors.surfaceMuted },
  accessory: { alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    ...typography.body,
  },
  inputMultiline: { textAlignVertical: "top" },
  hint: typography.caption,
  error: { ...typography.caption, color: colors.danger },
});
