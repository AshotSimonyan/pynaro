import { Tabs } from "expo-router";

// Tab icons and themed styling arrive with the design system in step 2.
export default function CustomerTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="bookings" options={{ title: "Bookings" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
