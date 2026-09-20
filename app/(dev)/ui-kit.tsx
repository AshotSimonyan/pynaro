import { useState } from "react";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Progress,
  Sheet,
  Switch,
  Textarea,
  useToast,
} from "@/components/ui";
import type { ButtonVariant } from "@/components/ui";
import { categoryAccents, colors, fonts, radius, spacing, typography } from "@/theme";

const BUTTON_VARIANTS: ButtonVariant[] = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "destructive",
];

/**
 * Every primitive in every variant, on one screen. It is the acceptance test
 * for step 2 and the place to eyeball a token change, so a new primitive or a
 * new variant belongs here the day it is written.
 */
export default function UiKitScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("Leaking under the kitchen sink.");
  const [notifications, setNotifications] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
      >
        <Section title="Colour">
          <View style={styles.swatchRow}>
            <Swatch label="primary" color={colors.primary} />
            <Swatch label="pressed" color={colors.primaryPressed} />
            <Swatch label="muted" color={colors.primaryMuted} />
            <Swatch label="ink" color={colors.text} />
            <Swatch label="success" color={colors.success} />
            <Swatch label="warning" color={colors.warning} />
            <Swatch label="danger" color={colors.danger} />
            <Swatch label="accent" color={colors.accent} />
          </View>
        </Section>

        <Section title="Category accents">
          <View style={styles.swatchRow}>
            {Object.entries(categoryAccents).map(([id, color]) => (
              <Swatch key={id} label={id} color={color} />
            ))}
          </View>
        </Section>

        <Section title="Type scale">
          <Text style={typography.eyebrow}>Eyebrow · DM Sans Bold</Text>
          <Text style={typography.display}>Display 28 · Manrope</Text>
          <Text style={typography.title}>Title 21 · Manrope</Text>
          <Text style={typography.heading}>Heading 17 · Manrope</Text>
          <Text style={typography.body}>
            Body 15 · DM Sans, the running size for copy.
          </Text>
          <Text style={typography.bodyStrong}>Body strong 15 · DM Sans SemiBold</Text>
          <Text style={typography.label}>Label 13 · DM Sans SemiBold</Text>
          <Text style={typography.caption}>
            Caption 12 · DM Sans, for hints and metadata.
          </Text>
          <View style={styles.sectionBody}>
            {[
              fonts.sans.regular,
              fonts.sans.medium,
              fonts.sans.semibold,
              fonts.sans.bold,
              fonts.display.bold,
              fonts.display.extrabold,
            ].map((family) => (
              <Text key={family} style={[typography.body, { fontFamily: family }]}>
                {family} — the quick brown fox
              </Text>
            ))}
          </View>
        </Section>

        <Section title="Button · variants">
          <View style={styles.row}>
            {BUTTON_VARIANTS.map((variant) => (
              <Button
                key={variant}
                label={variant}
                variant={variant}
                onPress={() => toast.show({ message: `${variant} pressed` })}
              />
            ))}
          </View>
        </Section>

        <Section title="Button · sizes, states">
          <View style={styles.row}>
            <Button label="Small" size="sm" />
            <Button label="Medium" size="md" />
            <Button label="Large" size="lg" />
          </View>
          <View style={styles.row}>
            <Button label="Disabled" disabled />
            <Button label="Loading" loading />
            <Button label="With icon" icon={<Dot color={colors.onPrimary} />} />
            <Button
              label="Icon only"
              iconOnly
              variant="outline"
              icon={<Dot color={colors.primary} />}
            />
          </View>
          <Button label="Full width" fullWidth />
        </Section>

        <Section title="Input">
          <Input
            label="Email"
            placeholder="you@example.com"
            value={text}
            onChangeText={setText}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input label="With hint" placeholder="Apt, suite" hint="Optional" />
          <Input
            label="With error"
            value="not-an-email"
            error="Enter a valid email address"
          />
          <Input label="Disabled" value="Locked value" editable={false} />
          <Input
            label="With accessories"
            placeholder="Search services"
            left={<Dot color={colors.textMuted} />}
            right={<Badge label="12" variant="secondary" size="sm" />}
          />
        </Section>

        <Section title="Textarea">
          <Textarea
            label="What is happening?"
            value={notes}
            onChangeText={setNotes}
            maxLength={240}
            showCount
            hint="A photo helps the technician prepare."
          />
          <Textarea label="Compact" rows={2} placeholder="Two rows" />
        </Section>

        <Section title="Card">
          <Card>
            <CardHeader
              eyebrow="Elevated"
              title="Active job"
              subtitle="Marcus is on the way"
              action={<Badge label="En route" variant="success" dot />}
            />
            <Text style={typography.body}>
              Default card: white, hairline, soft shadow.
            </Text>
          </Card>
          <Card variant="outlined">
            <Text style={typography.body}>Outlined, for nested surfaces.</Text>
          </Card>
          <Card variant="flat" padding="lg">
            <Text style={typography.body}>Flat, for quiet blocks inside a card.</Text>
          </Card>
        </Section>

        <Section title="Badge">
          <View style={styles.row}>
            <Badge label="Primary" />
            <Badge label="Secondary" variant="secondary" />
            <Badge label="Outline" variant="outline" />
            <Badge label="Available" variant="success" dot />
            <Badge label="Waiting" variant="warning" dot />
            <Badge label="Cancelled" variant="destructive" />
            <Badge label="Small" size="sm" />
          </View>
        </Section>

        <Section title="Switch">
          <View style={styles.inlineRow}>
            <Text style={typography.body}>Push notifications</Text>
            <Switch
              label="Push notifications"
              value={notifications}
              onValueChange={setNotifications}
            />
          </View>
          <View style={styles.inlineRow}>
            <Text style={typography.body}>Disabled, on</Text>
            <Switch label="Disabled, on" value disabled />
          </View>
          <View style={styles.inlineRow}>
            <Text style={typography.body}>Disabled, off</Text>
            <Switch label="Disabled, off" value={false} disabled />
          </View>
        </Section>

        <Section title="Progress">
          <Progress value={68} label="Finding professionals" />
          <Progress value={40} tone="success" />
          <Progress value={80} tone="warning" height={10} />
          <Progress value={15} tone="danger" />
        </Section>

        <Section title="Avatar">
          <View style={styles.inlineRow}>
            <Avatar name="Marcus Reed" size="sm" />
            <Avatar name="Elena Torres" color={categoryAccents.plumbing} />
            <Avatar name="Daniel Kim" size="lg" color={colors.text} />
            <Avatar name="Pynaro" size="lg" uri="https://i.pravatar.cc/128" />
          </View>
        </Section>

        <Section title="Sheet">
          <Button
            label="Open sheet"
            variant="outline"
            onPress={() => setSheetOpen(true)}
          />
        </Section>

        <Section title="Toast">
          <View style={styles.row}>
            <Button
              label="Info"
              variant="secondary"
              onPress={() => toast.show({ message: "No new notifications" })}
            />
            <Button
              label="Success"
              variant="secondary"
              onPress={() => toast.show({ message: "Location enabled", tone: "success" })}
            />
            <Button
              label="Error"
              variant="secondary"
              onPress={() =>
                toast.show({ message: "Could not update Pynaro", tone: "error" })
              }
            />
          </View>
        </Section>

        <Section title="Empty state">
          <EmptyState
            icon={<Dot color={colors.primary} />}
            title="No bookings yet"
            description="Your requests and their receipts will show up here."
            action={<Button label="Request service" />}
          />
          <EmptyState size="compact" title="Queue is clear" />
        </Section>
      </ScrollView>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Marcus Reed"
        description="Andy's Plumbing · 8 min away"
      >
        <View style={styles.inlineRow}>
          <Avatar name="Marcus Reed" size="lg" />
          <Badge label="Available now" variant="success" dot />
        </View>
        <Button label="Request service" fullWidth onPress={() => setSheetOpen(false)} />
      </Sheet>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

/** Stand-in for an icon: no icon set is installed yet. */
function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function Swatch({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.swatch}>
      <View style={[styles.swatchChip, { backgroundColor: color }]} />
      <Text style={styles.swatchLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xxl },
  section: { gap: spacing.md },
  sectionTitle: typography.eyebrow,
  sectionBody: { gap: spacing.md },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dot: { width: 14, height: 14, borderRadius: radius.pill },
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  swatch: { width: 64, gap: spacing.xs },
  swatchChip: {
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  swatchLabel: { ...typography.caption, fontSize: 10 },
});
