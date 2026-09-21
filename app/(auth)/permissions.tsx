import * as Location from "expo-location";
import { Redirect } from "expo-router";
import { LockKeyhole } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PynaroMark } from "@/components/brand";
import { Button, Card, Input, Switch } from "@/components/ui";
import { DEFAULT_PREFERENCES, savePreferences } from "@/lib/preferences-storage";
import { useSessionStore } from "@/stores";
import { borderWidth, colors, radius, spacing, typography } from "@/theme";

const PRIVACY_ICON_SIZE = 24;
const CARD_MARK_HEIGHT = 66;

/**
 * "Set up your experience" — the third screen of sign-up, ported from the
 * prototype's `.setup-screen`.
 *
 * It runs before the session is adopted, which is why it is reachable at all:
 * §2's gate unmounts `(auth)` the moment a session exists, so an onboarding
 * screen that ran after sign-in could not live in this group. `Continue` is
 * what turns the held session into a real one.
 */
export default function PermissionsScreen() {
  const pendingSession = useSessionStore((state) => state.pendingSession);
  const completeOnboarding = useSessionStore((state) => state.completeOnboarding);

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    DEFAULT_PREFERENCES.notificationsEnabled,
  );
  const [serviceAddress, setServiceAddress] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    const trimmed = serviceAddress.trim();
    // Preferences first, and they cannot fail the step: `savePreferences`
    // swallows. Adopting the session is the part that must succeed, and it is
    // last so nothing can leave the app signed in with onboarding half-written.
    await savePreferences({
      notificationsEnabled,
      serviceAddress: trimmed.length > 0 ? trimmed : null,
    });
    await completeOnboarding();
    // No navigation here on purpose. Adopting the session flips §2's guards,
    // `(auth)` leaves the navigation state, and the customer group mounts at
    // its own index. A `router.replace` would be racing that.
  }, [completeOnboarding, finishing, notificationsEnabled, serviceAddress]);

  // A deep link, or a fast refresh that cleared the store. There is no account
  // to finish setting up, so there is nothing this screen can do.
  if (pendingSession === null) return <Redirect href="/(auth)/welcome" />;

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Set up your experience</Text>

        <LocationCard />

        <View style={styles.privacy}>
          <LockKeyhole size={PRIVACY_ICON_SIZE} color={colors.success} />
          <Text style={styles.privacyText}>
            Your exact location stays private until you request and confirm a
            professional.
          </Text>
        </View>

        <Card variant="outlined" style={styles.rowCard}>
          <View style={styles.rowText}>
            <Text style={styles.cardTitle}>Turn on notifications</Text>
            <Text style={styles.cardBody}>
              Get updates on request status, arrival alerts, messages, and receipts.
            </Text>
          </View>
          {/* A preference, not a permission. No OS prompt is shown here: step 10
              asks the system once the first request is sent and there is
              something worth notifying about. Prompting during onboarding is how
              an app gets denied before it has earned the yes. */}
          <Switch
            label="Turn on notifications"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
        </Card>

        <Card variant="outlined" style={styles.addressCard}>
          <View style={styles.rowCard}>
            <View style={styles.rowText}>
              <Text style={styles.cardTitle}>Service address</Text>
              {editingAddress ? null : (
                <Text style={styles.cardBody}>
                  {serviceAddress.trim().length > 0
                    ? serviceAddress
                    : "Add the address you usually need service at."}
                </Text>
              )}
            </View>
            {editingAddress ? null : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setEditingAddress(true)}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={styles.link}>
                  {serviceAddress.trim().length > 0 ? "Change" : "Add"}
                </Text>
              </Pressable>
            )}
          </View>
          {editingAddress ? (
            <Input
              value={serviceAddress}
              onChangeText={setServiceAddress}
              placeholder="123 Main St, Los Angeles, CA"
              autoComplete="street-address"
              textContentType="fullStreetAddress"
              returnKeyType="done"
              autoFocus
              onSubmitEditing={() => setEditingAddress(false)}
              onBlur={() => setEditingAddress(false)}
              containerStyle={styles.addressInput}
            />
          ) : null}
        </Card>

        <Button
          label="Continue"
          size="lg"
          fullWidth
          loading={finishing}
          onPress={() => {
            void finish();
          }}
          style={styles.submit}
        />

        <Pressable
          accessibilityRole="button"
          disabled={finishing}
          onPress={() => {
            void finish();
          }}
          style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
        >
          {/* Every choice on this screen has a working default, so there is no
              state where finishing is impossible. Saying so is kinder than
              leaving people hunting for the way past a permission. */}
          <Text style={styles.skipText}>Set this up later</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * The location ask, with the OS prompt behind it.
 *
 * Foreground only. §7 puts the "Always" request at the technician's first job
 * acceptance, behind a screen that explains it, so this asks for exactly what
 * the copy on it describes.
 *
 * Three end states, not two: granted, denied but askable again, and denied for
 * good. The third is the one apps usually get wrong — iOS answers the second
 * `requestForegroundPermissionsAsync` without showing anything, so a button
 * that kept calling it would look broken. That case sends people to Settings.
 */
function LocationCard() {
  const [status, setStatus] = useState<Location.PermissionStatus | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let active = true;
    Location.getForegroundPermissionsAsync()
      .then((result) => {
        if (!active) return;
        setStatus(result.status);
        setCanAskAgain(result.canAskAgain);
      })
      .catch(() => {
        // A simulator without location services, or a platform that has none.
        // Unknown is the same as not-yet-granted for everything below.
      });
    return () => {
      active = false;
    };
  }, []);

  const granted = status === Location.PermissionStatus.GRANTED;
  const blocked = status === Location.PermissionStatus.DENIED && !canAskAgain;

  const ask = async () => {
    if (asking || granted) return;
    if (blocked) {
      await Linking.openSettings();
      return;
    }
    setAsking(true);
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      setStatus(result.status);
      setCanAskAgain(result.canAskAgain);
    } catch {
      // Treated as a decline. There is nothing to retry and nothing to report:
      // the screen's own default is that location is off.
    } finally {
      setAsking(false);
    }
  };

  return (
    <Card variant="outlined" style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <PynaroMark height={CARD_MARK_HEIGHT} />
        <View style={styles.rowText}>
          <Text style={styles.cardTitle}>Enable your location</Text>
          <Text style={styles.cardBody}>
            Pynaro uses your location to show nearby professionals and accurate arrival
            times.
          </Text>
        </View>
      </View>
      <Button
        label={
          granted ? "Location enabled" : blocked ? "Open Settings" : "Allow Location"
        }
        variant={granted ? "secondary" : "primary"}
        fullWidth
        disabled={granted}
        loading={asking}
        onPress={() => {
          void ask();
        }}
        style={styles.locationButton}
      />
      {blocked ? (
        <Text style={styles.cardBody}>
          Location is turned off for Pynaro. You can turn it back on in Settings, or carry
          on and type an address instead.
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
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
  locationCard: { gap: spacing.md },
  locationHeader: { flexDirection: "row", gap: spacing.md },
  locationButton: { marginTop: spacing.xs },
  privacy: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: borderWidth.hairline,
    borderColor: colors.success,
    borderRadius: radius.md,
    backgroundColor: colors.successMuted,
  },
  privacyText: { ...typography.caption, flex: 1, color: colors.success },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  rowText: { flex: 1, gap: spacing.xxs },
  addressCard: { gap: spacing.md },
  addressInput: { marginTop: spacing.sm },
  cardTitle: typography.bodyStrong,
  cardBody: { ...typography.caption, lineHeight: 17 },
  link: { ...typography.caption, fontSize: 11, color: colors.primary },
  pressed: { opacity: 0.6 },
  submit: { marginTop: spacing.sm },
  skip: { alignItems: "center", paddingVertical: spacing.sm },
  skipText: { ...typography.caption, fontSize: 11, color: colors.textMuted },
});
