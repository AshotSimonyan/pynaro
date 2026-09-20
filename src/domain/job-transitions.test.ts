/**
 * Two kinds of test.
 *
 * The first parses the §6 table out of docs/architecture.md and asserts that
 * `JOB_TRANSITIONS` reproduces it exactly. The doc is the specification handed
 * to the backend developer in step 14, so a disagreement between it and the
 * code is a defect in one of them — and until the backend exists, nothing else
 * would catch it.
 *
 * The second exercises the affordance helpers, which is where a mistake would
 * show up as a button that should not be there.
 */
import { diagramEdges, documentedTransitions, normalise } from "@/test-support/section-6";
import { statusLabels, type JobIntent, type JobStatus } from "@/api/types";

import {
  JOB_TRANSITIONS,
  TERMINAL_STATUSES,
  actionsFor,
  isTerminal,
  resultOf,
} from "./job-transitions";

describe("§6 of docs/architecture.md", () => {
  it("is reproduced by JOB_TRANSITIONS, row for row and in order", () => {
    expect(JOB_TRANSITIONS.map(normalise)).toEqual(
      documentedTransitions().map(normalise),
    );
  });

  it("names only states the JobStatus union has", () => {
    // statusLabels is Record<JobStatus, string>, so its keys are the union.
    const known = new Set(Object.keys(statusLabels));
    const used = new Set(documentedTransitions().flatMap((t) => [t.from, t.to]));
    expect([...used].filter((s) => !known.has(s))).toEqual([]);
  });

  it("uses every state the JobStatus union declares", () => {
    const used = new Set<string>(documentedTransitions().flatMap((t) => [t.from, t.to]));
    expect(Object.keys(statusLabels).filter((s) => !used.has(s))).toEqual([]);
  });

  it("agrees with its own mermaid diagram", () => {
    const edges = diagramEdges();
    const drawn = new Set(
      edges
        .filter(([from, to]) => from !== "[*]" && to !== "[*]")
        .map(([f, t]) => `${f}->${t}`),
    );
    const tabled = new Set(JOB_TRANSITIONS.map((t) => `${t.from}->${t.to}`));
    expect([...drawn].sort()).toEqual([...tabled].sort());
  });

  it("starts the diagram at the one state nothing transitions into", () => {
    const entry = diagramEdges()
      .filter(([from]) => from === "[*]")
      .map(([, to]) => to);
    const reachedByTransition = new Set(JOB_TRANSITIONS.map((t) => t.to));
    const roots = Object.keys(statusLabels).filter(
      (s) => !reachedByTransition.has(s as JobStatus),
    );
    expect(entry).toEqual(["requested"]);
    expect(roots).toEqual(["requested"]);
  });

  it("draws an exit arrow from exactly the terminal states", () => {
    const exits = diagramEdges()
      .filter(([, to]) => to === "[*]")
      .map(([from]) => from)
      .sort();
    expect(exits).toEqual([...TERMINAL_STATUSES].sort());
  });
});

// ---------------------------------------------------------------------------
// The table's own consistency
// ---------------------------------------------------------------------------

/**
 * Exhaustive by construction: adding a `JobIntent` without adding it here is a
 * compile error, which is what makes the "no dead intent" test below honest.
 */
const ALL_INTENTS: Record<JobIntent, true> = {
  accept: true,
  cancel: true,
  depart: true,
  arrive: true,
  estimate: true,
  approve_estimate: true,
  decline_estimate: true,
  start: true,
  complete: true,
  pay: true,
};

describe("the transition table", () => {
  it("has no unreachable state", () => {
    const reachable = new Set<JobStatus>(["requested"]);
    for (let pass = 0; pass < JOB_TRANSITIONS.length; pass++) {
      for (const t of JOB_TRANSITIONS) if (reachable.has(t.from)) reachable.add(t.to);
    }
    expect([...reachable].sort()).toEqual(Object.keys(statusLabels).sort());
  });

  it("lists exactly the states with no outgoing transition as terminal", () => {
    const hasExit = new Set(JOB_TRANSITIONS.map((t) => t.from));
    const dead = Object.keys(statusLabels).filter((s) => !hasExit.has(s as JobStatus));
    expect(dead.sort()).toEqual([...TERMINAL_STATUSES].sort());
    for (const status of TERMINAL_STATUSES) expect(isTerminal(status)).toBe(true);
    expect(isTerminal("requested")).toBe(false);
  });

  it("uses every declared intent at least once", () => {
    const used = new Set(JOB_TRANSITIONS.map((t) => t.trigger));
    expect(Object.keys(ALL_INTENTS).filter((i) => !used.has(i as JobIntent))).toEqual([]);
  });

  it("never gives one actor two ways to leave a state with the same trigger", () => {
    const seen = JOB_TRANSITIONS.map((t) => `${t.from}:${t.trigger}`);
    expect(seen).toEqual([...new Set(seen)]);
  });

  it("gives every state a label", () => {
    for (const status of Object.keys(statusLabels) as JobStatus[]) {
      expect(statusLabels[status].length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Affordances
// ---------------------------------------------------------------------------

describe("actionsFor", () => {
  it("offers the customer only their own actions", () => {
    expect(actionsFor("requested", "customer")).toEqual(["cancel"]);
    expect(actionsFor("estimate_sent", "customer")).toEqual([
      "approve_estimate",
      "decline_estimate",
    ]);
    expect(actionsFor("completed", "customer")).toEqual(["pay"]);
    expect(actionsFor("en_route", "customer")).toEqual([]);
    expect(actionsFor("arrived", "customer")).toEqual([]);
  });

  it("offers the technician only theirs", () => {
    expect(actionsFor("requested", "technician")).toEqual(["accept"]);
    expect(actionsFor("accepted", "technician")).toEqual(["depart"]);
    expect(actionsFor("en_route", "technician")).toEqual(["arrive"]);
    expect(actionsFor("approved", "technician")).toEqual(["start"]);
    expect(actionsFor("in_progress", "technician")).toEqual(["complete"]);
    expect(actionsFor("completed", "technician")).toEqual([]);
  });

  it("offers both ways out of arrived, estimate and straight to complete", () => {
    expect(actionsFor("arrived", "technician")).toEqual(["estimate", "complete"]);
  });

  it("offers nothing to anyone in a terminal state", () => {
    for (const status of TERMINAL_STATUSES) {
      expect(actionsFor(status, "customer")).toEqual([]);
      expect(actionsFor(status, "technician")).toEqual([]);
    }
  });

  it("never surfaces a dispatcher-only or server-only action", () => {
    // accept is technician-or-dispatcher, so the technician keeps it and the
    // customer must not inherit it.
    expect(actionsFor("requested", "customer")).not.toContain("accept");
    // expire belongs to the response timer alone: no role may ever see it.
    for (const status of Object.keys(statusLabels) as JobStatus[]) {
      expect(actionsFor(status, "customer")).not.toContain("expire");
      expect(actionsFor(status, "technician")).not.toContain("expire");
    }
  });
});

describe("resultOf", () => {
  it("reports where a legal trigger leads", () => {
    expect(resultOf("arrived", "estimate")).toBe("estimate_sent");
    expect(resultOf("arrived", "complete")).toBe("completed");
    expect(resultOf("in_progress", "complete")).toBe("completed");
    expect(resultOf("completed", "pay")).toBe("paid");
  });

  it("sends a declined estimate back to arrived, not to a terminal state", () => {
    expect(resultOf("estimate_sent", "decline_estimate")).toBe("arrived");
    expect(isTerminal("arrived")).toBe(false);
  });

  it("expires a request into expired, distinct from cancelled", () => {
    expect(resultOf("requested", "expire")).toBe("expired");
    expect(resultOf("requested", "cancel")).toBe("cancelled");
    expect(isTerminal("expired")).toBe(true);
  });

  it("returns null for a pairing the table does not have", () => {
    expect(resultOf("requested", "pay")).toBeNull();
    expect(resultOf("paid", "cancel")).toBeNull();
    expect(resultOf("arrived", "expire")).toBeNull();
  });
});
