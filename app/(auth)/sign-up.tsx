import { useRouter } from "expo-router";
import { Apple } from "lucide-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { SocialProvider } from "@/api";
import { BackButton, Button, Checkbox, Input } from "@/components/ui";
import {
  authFormError,
  errorFor,
  useSignInWithProvider,
  useSignUp,
} from "@/features/session";
import { colors, spacing, typography } from "@/theme";

const SOCIAL_ICON_SIZE = 18;

const NETWORK_FALLBACK =
  "We could not create your account. Check your connection and try again.";

/**
 * Create your account, ported from the prototype's `.account-screen`.
 *
 * Validation is the server's. The screen sends what was typed and renders what
 * comes back against the field the error names — the same errors the real
 * backend will raise, since the mock raises §3's envelope. Duplicating the
 * rules here would only create a second place for them to disagree.
 *
 * What the screen does decide is when the button is tappable: a submit that
 * could only fail is worse than a disabled button, so every field has to have
 * something in it and the terms have to be accepted.
 */
export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const signUp = useSignUp();
  const social = useSignInWithProvider();
  const busy = signUp.isPending || social.isPending;

  const error = authFormError(signUp.error ?? social.error, NETWORK_FALLBACK);

  const submit = () => {
    if (busy) return;
    signUp.mutate(
      { name, phone, email, password, acceptedTerms },
      // Onboarding, not the app: the session is held rather than adopted until
      // the setup screen's Continue (§2's gate would unmount this group).
      { onSuccess: () => router.push("/(auth)/permissions") },
    );
  };

  const continueWith = (provider: SocialProvider) => {
    if (busy) return;
    social.mutate(provider, {
      onSuccess: () => router.push("/(auth)/permissions"),
    });
  };

  const complete =
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length > 0 &&
    acceptedTerms;

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
          <Text style={styles.title}>Create your account</Text>

          <Input
            label="Full Name"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            editable={!busy}
            error={errorFor(error, "name")}
          />
          <Input
            label="Mobile Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
            editable={!busy}
            error={errorFor(error, "phone")}
          />
          <Input
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            editable={!busy}
            error={errorFor(error, "email")}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            // `newPassword` rather than `password`, so the keychain offers to
            // generate and save one instead of autofilling an existing login.
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!busy}
            error={errorFor(error, "password")}
          />

          <Checkbox
            checked={acceptedTerms}
            onChange={setAcceptedTerms}
            disabled={busy}
            label="I agree to the Terms of Service and Privacy Policy"
            style={styles.terms}
          >
            <Text style={styles.termsText}>
              I agree to the <Text style={styles.emphasis}>Terms of Service</Text> and{" "}
              <Text style={styles.emphasis}>Privacy Policy</Text>
            </Text>
          </Checkbox>

          {/* Anything the server said that was not about one field: a 401, a
              dropped connection. Field errors render on the field itself. */}
          {error !== null && error.field === null ? (
            <Text style={styles.formError}>{error.message}</Text>
          ) : null}

          <Button
            label="Create Account"
            size="lg"
            fullWidth
            onPress={submit}
            loading={signUp.isPending}
            disabled={!complete || busy}
            style={styles.submit}
          />

          <View style={styles.orRow}>
            <View style={styles.rule} />
            <Text style={styles.orText}>or continue with</Text>
            <View style={styles.rule} />
          </View>

          <Button
            label="Continue with Apple"
            variant="outline"
            size="lg"
            fullWidth
            disabled={busy}
            onPress={() => continueWith("apple")}
            icon={<Apple size={SOCIAL_ICON_SIZE} color={colors.text} />}
            style={styles.social}
          />
          <Button
            label="Continue with Google"
            variant="outline"
            size="lg"
            fullWidth
            disabled={busy}
            onPress={() => continueWith("google")}
            icon={<Text style={styles.googleG}>G</Text>}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/(auth)/sign-in")}
            disabled={busy}
            style={({ pressed }) => [styles.footer, pressed && styles.footerPressed]}
          >
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.emphasis}>Log In</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  title: {
    ...typography.display,
    fontSize: 25,
    lineHeight: 30,
    marginBottom: spacing.xs,
  },
  terms: { marginTop: spacing.xs },
  termsText: { ...typography.caption, fontSize: 11, lineHeight: 15 },
  emphasis: { color: colors.primary },
  formError: { ...typography.caption, color: colors.danger },
  submit: { marginTop: spacing.xs },
  orRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { ...typography.caption, fontSize: 10 },
  social: { marginBottom: spacing.xs },
  googleG: { ...typography.label, fontSize: 17, color: colors.brandGoogle },
  footer: { marginTop: spacing.sm, alignItems: "center" },
  footerPressed: { opacity: 0.6 },
  footerText: { ...typography.caption, fontSize: 11 },
});
