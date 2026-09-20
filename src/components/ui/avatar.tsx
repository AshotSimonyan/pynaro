import { Image, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { colors, fonts, radius } from "@/theme";

export type AvatarSize = "sm" | "md" | "lg";

export type AvatarProps = {
  name: string;
  /** Falls back to initials while absent or while the image fails to load. */
  uri?: string;
  /** Usually the business colour the person belongs to. */
  color?: string;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({
  name,
  uri,
  color = colors.primary,
  size = "md",
  style,
}: AvatarProps) {
  const diameter = diameters[size];

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[
        styles.base,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: color,
        },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.image} accessibilityIgnoresInvertColors />
      ) : (
        <Text style={[styles.initials, { fontSize: diameter * 0.36 }]}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

/** "Marcus Reed" to "MR", one letter for a single-word name. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((word) => word.charAt(0).toUpperCase()).join("");
}

const diameters: Record<AvatarSize, number> = { sm: 32, md: 40, lg: 64 };

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  image: { width: "100%", height: "100%", borderRadius: radius.pill },
  initials: {
    fontFamily: fonts.sans.bold,
    color: colors.textOnDark,
    letterSpacing: 0.3,
  },
});
