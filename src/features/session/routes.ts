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
 * Sign-in rather than welcome, for now. Welcome is still the step 1
 * placeholder and has no way out of itself; step 7 builds it properly and this
 * moves to `/(auth)/welcome`.
 */
export const SIGNED_OUT_ROUTE = "/(auth)/sign-in" as const;

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
