/**
 * Where a session belongs.
 *
 * One function, used by every group gate and by `(auth)`'s index, so
 * "which group does a technician live in" has a single answer. A gate that
 * inlined its own would be the one that drifts when a group is renamed.
 */
import type { AppRole } from "@/api";
import type { SessionSnapshot } from "@/stores";

/**
 * Welcome, which is where a signed-out app belongs: it is the only auth screen
 * that offers both a way in and a way to sign up, and both of the others are
 * reachable from it.
 */
export const SIGNED_OUT_ROUTE = "/(auth)/welcome" as const;

/**
 * The group's tab index, not the group itself. A group is a path segment, not a
 * route, so `/(pro)` is not somewhere the router can go — typed routes catch
 * this, which is the argument for having them on.
 */
export function homeForRole(role: AppRole) {
  return role === "technician"
    ? ("/(pro)/(tabs)" as const)
    : ("/(customer)/(tabs)" as const);
}

/**
 * The route a snapshot should be looking at, or null while it is still
 * hydrating and the answer is not known yet.
 */
export function homeForSession(session: SessionSnapshot) {
  if (session.status === "hydrating") return null;
  if (session.status === "signed-out") return SIGNED_OUT_ROUTE;
  return homeForRole(session.user.role);
}
