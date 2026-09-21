import { ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { Href } from "expo-router";

import { colors, spacing } from "@/theme";

import { Button } from "./button";

const ICON_SIZE = 22;

export type BackButtonProps = {
  /**
   * Where to go when there is no history to pop — a deep link, or a screen
   * opened as the first in its stack. Without it the button would be dead in
   * exactly the case a user is most likely to be stuck.
   */
  fallback: Href;
  label?: string;
};

/**
 * The back affordance, ported from the prototype's `.onboarding-back`.
 *
 * Every stack in the app runs with `headerShown: false` (see
 * `stackScreenOptions`), so no screen gets a back control for free and each one
 * that can be pushed onto has to draw its own.
 */
export function BackButton({ fallback, label = "Go back" }: BackButtonProps) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <Button
        label={label}
        variant="ghost"
        iconOnly
        icon={<ArrowLeft size={ICON_SIZE} color={colors.text} />}
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace(fallback);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Left-aligned in its own row, so it never stretches and never sits on top of
  // the content below it.
  row: { alignItems: "flex-start", marginLeft: -spacing.sm },
});
