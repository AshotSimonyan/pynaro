/**
 * The mock's machine is the server's copy of §6. It is a separate object from
 * the app's affordance table on purpose (see machine.ts), so it needs its own
 * proof that it matches the document — and a proof that the two copies agree
 * with each other, which is what makes a `409` a real disagreement rather than
 * an impossible one.
 */
import { JOB_TRANSITIONS } from "@/domain/job-transitions";
import { documentedTransitions, normalise } from "@/test-support/section-6";

import { MOCK_TRANSITIONS, findTransition, triggersFrom } from "./machine";

describe("the mock's job machine", () => {
  it("reproduces §6 of docs/architecture.md, row for row and in order", () => {
    expect(MOCK_TRANSITIONS.map(normalise)).toEqual(
      documentedTransitions().map(normalise),
    );
  });

  it("agrees with the app's affordance table", () => {
    expect(MOCK_TRANSITIONS.map(normalise)).toEqual(JOB_TRANSITIONS.map(normalise));
  });

  it("is a separate object from the app's table", () => {
    // If these were the same array the client could never hold a stale view of
    // the machine, and the conflict path in §6 would be untestable.
    expect(MOCK_TRANSITIONS).not.toBe(JOB_TRANSITIONS);
  });

  it("attaches an effect to every transition that changes more than status", () => {
    // Every row here does something beyond moving the status: at minimum it
    // writes a timeline entry. A row with no effect is a row someone forgot.
    for (const transition of MOCK_TRANSITIONS) {
      expect(typeof transition.apply).toBe("function");
    }
  });

  it("finds a transition by state and trigger, and only the right one", () => {
    expect(findTransition("arrived", "complete")?.to).toBe("completed");
    expect(findTransition("arrived", "estimate")?.to).toBe("estimate_sent");
    expect(findTransition("requested", "pay")).toBeNull();
    expect(findTransition("paid", "cancel")).toBeNull();
  });

  it("lists every trigger legal from a state", () => {
    expect(triggersFrom("requested").sort()).toEqual(
      ["accept", "cancel", "expire"].sort(),
    );
    expect(triggersFrom("arrived").sort()).toEqual(["complete", "estimate"].sort());
    expect(triggersFrom("paid")).toEqual([]);
  });
});
