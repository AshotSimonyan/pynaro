import { useRouter } from "expo-router";
import { LifeBuoy, UserRound } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Wordmark } from "@/components/brand";
import { Button, useToast } from "@/components/ui";
import { colors, spacing, typography } from "@/theme";

const LINK_ICON_SIZE = 18;

/**
 * The first screen, ported from the prototype's `.welcome-screen`.
 *
 * Its two buttons diverge from the prototype on purpose: there, "Get Started"
 * and "Log In" both advance to the same create-account step, because the
 * prototype never authenticates anyone. Here they are different destinations,
 * which is what the labels have always promised.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const toast = useToast();

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <Wordmark />
          <Text style={styles.pitch}>
            Find trusted local professionals{"\n"}who are available near you.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            label="Get Started"
            size="lg"
            fullWidth
            onPress={() => router.push("/(auth)/sign-up")}
          />
          <Button
            label="Log In"
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => router.push("/(auth)/sign-in")}
          />
        </View>

        <View style={styles.links}>
          <LinkRow
            icon={<LifeBuoy size={LINK_ICON_SIZE} color={colors.primary} />}
            onPress={() =>
              toast.show({
                message:
                  "Choose a service, select one nearby pro, approve the estimate, and track the job in Pynaro.",
              })
            }
          >
            <Text style={styles.linkText}>How It Works</Text>
          </LinkRow>

          {/* The prototype's version of this flipped a role picker, which §2
              rules out. A technician account is created by their business in
              the dashboard, so the honest answer here is to say so rather than
              to offer a sign-up this app cannot complete. */}
          <LinkRow
            icon={<UserRound size={LINK_ICON_SIZE} color={colors.primary} />}
            onPress={() =>
              toast.show({
                message:
                  "Pro accounts are set up by your business. Ask them to invite you, then log in here.",
              })
            }
          >
            <Text style={styles.linkText}>
              Are you a service professional?{"\n"}
              <Text style={styles.linkTextStrong}>Join Pynaro Pro</Text>
            </Text>
          </LinkRow>
        </View>

        {/* TODO: link Terms and Privacy Policy once the marketing site has
            URLs for them. Emphasised text rather than dead buttons until then. */}
        <Text style={styles.legal}>
          By continuing, you agree to our <Text style={styles.legalStrong}>Terms</Text> &{" "}
          <Text style={styles.legalStrong}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function LinkRow({
  icon,
  onPress,
  children,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
    >
      {icon}
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  // The prototype pins the brand 78px down and lets the small print sit at the
  // bottom. `flex: 1` on the brand block does both without a magic number, and
  // survives a short screen where a fixed offset would push the buttons off.
  brand: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
  },
  pitch: {
    ...typography.body,
    marginTop: spacing.xxl,
    color: colors.textMuted,
    textAlign: "center",
  },
  actions: { gap: spacing.sm },
  links: { marginTop: spacing.xxl, gap: spacing.lg },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  linkRowPressed: { opacity: 0.6 },
  linkText: { ...typography.caption, color: colors.primary },
  linkTextStrong: { ...typography.label, fontSize: 12, color: colors.primary },
  legal: {
    ...typography.caption,
    marginTop: spacing.xxl,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
  legalStrong: { color: colors.primary },
});
