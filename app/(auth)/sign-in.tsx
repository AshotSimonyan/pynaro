import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackButton, Button, Input } from "@/components/ui";
import { authFormError, errorFor, useSignIn } from "@/features/session";
import { colors, spacing, typography } from "@/theme";

/**
 * Sign-in, kept plain on purpose.
 *
 * The prototype has no sign-in screen — its onboarding is a three-step demo
 * where "Log In" and "Get Started" go to the same place and neither
 * authenticates anyone — so there is nothing to port here. Welcome and
 * create-account carry the design; this one carries §2's gate: two accounts,
 * two roles, and the role arriving from the server rather than from a picker.
 */
export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = useSignIn();

  const error = authFormError(
    signIn.error,
    "We could not sign you in. Check your connection and try again.",
  );
  const message = error?.field === null ? error.message : null;

  const submit = () => {
    if (signIn.isPending) return;
    signIn.mutate({ email, password });
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <BackButton fallback="/(auth)/welcome" />
          <Text style={styles.title}>Log in</Text>
          <Text style={styles.subtitle}>
            Welcome back. Your account decides what you see next.
          </Text>

          <Input
            label="Email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            editable={!signIn.isPending}
            error={errorFor(error, "email")}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!signIn.isPending}
            error={errorFor(error, "password") ?? message ?? undefined}
          />

          <Button
            label="Log in"
            onPress={submit}
            loading={signIn.isPending}
            disabled={email.trim().length === 0 || password.length === 0}
            fullWidth
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/(auth)/sign-up")}
            disabled={signIn.isPending}
            style={({ pressed }) => [styles.footer, pressed && styles.footerPressed]}
          >
            <Text style={styles.footerText}>
              New to Pynaro? <Text style={styles.footerStrong}>Create an account</Text>
            </Text>
          </Pressable>

          {__DEV__ && <SeedAccountHint />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * The mock's two accounts, shown only in development.
 *
 * There is no role picker — §2 rules it out and the hard rules repeat it — so
 * the only way to reach the technician app is to know a technician's
 * credentials. Printing them here keeps that honest: the app still learns the
 * role from the server, and a developer is not left guessing at seed data.
 * `__DEV__` is false in a release bundle, so this goes with it.
 */
function SeedAccountHint() {
  return (
    <Text style={styles.hint}>
      Mock accounts — customer: arman@pynaro.test · technician: marcus@andys.test
      {"\n"}Password for both: pynaro
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: typography.display,
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.sm },
  footer: { alignItems: "center", paddingVertical: spacing.xs },
  footerPressed: { opacity: 0.6 },
  footerText: { ...typography.caption, fontSize: 11 },
  footerStrong: { color: colors.primary },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
