import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isApiError } from "@/api";
import { Button, Input } from "@/components/ui";
import { useSignIn } from "@/features/session";
import { colors, spacing, typography } from "@/theme";

/**
 * Sign-in, kept plain on purpose.
 *
 * The prototype has no sign-in screen — its onboarding is a three-step demo
 * that never authenticates anyone — so there is nothing to port here, and step
 * 7's welcome and create-account screens are where the design work belongs.
 * What this needs to do today is prove §2's gate: two accounts, two roles, and
 * the role arriving from the server rather than from a picker.
 */
export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = useSignIn();

  // A 401 is the user's mistake and reads as one. Anything else is ours, and
  // saying "email or password is incorrect" about a dropped connection sends
  // people off to reset a password that was fine.
  const message =
    signIn.error === null
      ? null
      : isApiError(signIn.error) && signIn.error.status === 401
        ? signIn.error.message
        : "We could not sign you in. Check your connection and try again.";

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
            error={message ?? undefined}
          />

          <Button
            label="Log in"
            onPress={submit}
            loading={signIn.isPending}
            disabled={email.trim().length === 0 || password.length === 0}
            fullWidth
          />

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
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
