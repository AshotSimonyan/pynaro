import { Tabs } from "expo-router";

export default function ProTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="requests" options={{ title: "Requests" }} />
      <Tabs.Screen name="jobs" options={{ title: "Jobs" }} />
      <Tabs.Screen name="earnings" options={{ title: "Earnings" }} />
    </Tabs>
  );
}
