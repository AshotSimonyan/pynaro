import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "@/theme";

export type SheetProps = {
  open: boolean;
  /** Called both on programmatic dismissal and on a swipe or backdrop tap. */
  onClose: () => void;
  title?: string;
  description?: string;
  /** Omit to size the sheet to its content. */
  snapPoints?: (string | number)[];
  children?: ReactNode;
};

/**
 * Bottom sheet over `@gorhom/bottom-sheet`. Needs `BottomSheetModalProvider`
 * inside `GestureHandlerRootView`; the root layout mounts both.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  snapPoints,
  children,
}: SheetProps) {
  const sheet = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (open) sheet.current?.present();
    else sheet.current?.dismiss();
  }, [open]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheet}
      snapPoints={snapPoints}
      enableDynamicSizing={snapPoints === undefined}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView
        style={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        {title || description ? (
          <View style={styles.header}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {description ? <Text style={styles.description}>{description}</Text> : null}
          </View>
        ) : null}
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
  },
  handle: { backgroundColor: colors.border, width: 40 },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  header: { gap: spacing.xs },
  title: typography.title,
  description: typography.caption,
});
