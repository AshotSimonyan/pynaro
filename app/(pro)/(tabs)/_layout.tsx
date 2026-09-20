import { Tabs } from "expo-router";

import { tabBarScreenOptions } from "@/theme";

// Tab icons arrive with the technician screens in step 12.
export default function ProTabsLayout() {
  return (
    <Tabs screenOptions={tabBarScreenOptions}>
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="requests" options={{ title: "Requests" }} />
      <Tabs.Screen name="jobs" options={{ title: "Jobs" }} />
      <Tabs.Screen name="earnings" options={{ title: "Earnings" }} />
    </Tabs>
  );
}
