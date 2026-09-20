import { PlaceholderScreen } from "@/components/placeholder-screen";
import { SignOutButton } from "@/features/session";

// The technician group has no account tab, so sign-out lives on the dashboard
// until step 12 gives it a proper home.
export default function ProDashboardScreen() {
  return (
    <PlaceholderScreen title="Dashboard">
      <SignOutButton />
    </PlaceholderScreen>
  );
}
