import { Platform, StyleSheet } from "react-native";

import { colors } from "./colors";
import { fonts } from "./fonts";
import { borderWidth } from "./layout";
import { typography } from "./typography";

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: borderWidth.hairline,
    borderTopColor: colors.borderSubtle,
    height: Platform.OS === "ios" ? 84 : 64,
    paddingTop: 6,
  },
  label: {
    fontFamily: fonts.sans.semibold,
    fontSize: typography.caption.fontSize,
  },
  scene: { backgroundColor: colors.background },
});

/**
 * Chrome shared by both tab bars. The customer and technician groups differ
 * only in their screens, so the styling is declared once. Icons arrive with the
 * screens in steps 8 and 12.
 */
export const tabBarScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: styles.bar,
  tabBarLabelStyle: styles.label,
  sceneStyle: styles.scene,
};

/** Chrome shared by every native stack, including the group stacks. */
export const stackScreenOptions = {
  headerShown: false,
  contentStyle: styles.scene,
};
