/**
 * Step 6's acceptance criterion, as a decision table: where each session
 * belongs.
 *
 * It is worth pinning here rather than only in the gates because three places
 * ask the question — the root layout's guards and both group layouts — and the
 * failure mode of disagreement is a redirect loop, which is a miserable thing
 * to debug from a simulator.
 */
import type { SessionSnapshot } from "@/stores";

import { SIGNED_OUT_ROUTE, homeForRole, homeForSession } from "./routes";

const CUSTOMER: SessionSnapshot = {
  status: "signed-in",
  user: {
    id: "arman",
    role: "customer",
    name: "Arman G.",
    email: "arman@pynaro.test",
    phone: "(424) 888-5555",
    businessId: null,
  },
};

const TECHNICIAN: SessionSnapshot = {
  status: "signed-in",
  user: {
    id: "marcus",
    role: "technician",
    name: "Marcus Reed",
    email: "marcus@andys.test",
    phone: "(424) 888-1210",
    businessId: "andys",
  },
};

describe("homeForSession", () => {
  it("has no answer while the session is hydrating", () => {
    // Which is why the splash is held: a redirect here would be a guess, and
    // half the time it would be the wrong group.
    expect(homeForSession({ status: "hydrating", user: null })).toBeNull();
  });

  it("sends a signed-out session to the auth group", () => {
    expect(homeForSession({ status: "signed-out", user: null })).toBe(SIGNED_OUT_ROUTE);
  });

  it("sends each role to its own group", () => {
    expect(homeForSession(CUSTOMER)).toBe("/(customer)/(tabs)");
    expect(homeForSession(TECHNICIAN)).toBe("/(pro)/(tabs)");
  });

  it("agrees with homeForRole, which the group gates use", () => {
    expect(homeForSession(CUSTOMER)).toBe(homeForRole("customer"));
    expect(homeForSession(TECHNICIAN)).toBe(homeForRole("technician"));
  });

  it("names a group's index, never the group itself", () => {
    // `/(pro)` is a path segment, not a route. Redirecting to one silently
    // lands on +not-found.
    for (const href of [homeForRole("customer"), homeForRole("technician")]) {
      expect(href).toMatch(/\(tabs\)$/);
    }
  });
});
