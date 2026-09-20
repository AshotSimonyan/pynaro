import { StyleSheet, Text, View } from "react-native";

/**
 * Step 1 stand-in. Every route in docs/architecture.md §2 exists so the router
 * tree and the group gates are real from the start; the screens themselves
 * arrive in steps 7 to 13. Replaced by real UI, not extended.
 */
export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, opacity: 0.4 },
});
