import { Stack } from "expo-router";

// The wizard is a stack, not five screens pushing a shared global. Step 10
// gives this layout the draft store, scoped here so backing out of the flow
// disposes the draft with the layout.
export const unstable_settings = { anchor: "service" };

export default function RequestWizardLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
