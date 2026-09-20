/**
 * The transition table from §6 of docs/architecture.md, answering one question:
 * given this status and this role, which action does the screen offer?
 *
 * **It drives affordances only.** The server owns the machine and is the sole
 * authority on whether a transition is legal. This table exists so a screen can
 * decide what to render without a round trip — not so the client can decide
 * what is allowed. A screen that offers an action still has to handle the
 * server refusing it.
 *
 * Conflicts are expected rather than exceptional: the backend answers `409`
 * with the job's current state, the client replaces its cache with that state
 * and re-renders. So this table going briefly stale against the server is a
 * normal condition, not a bug to defend against.
 *
 * `job-transitions.test.ts` parses the §6 table out of the Markdown and fails
 * if it and this file disagree, so the two cannot drift apart silently.
 */
import type { AppRole, JobIntent, JobActor, JobStatus, JobTrigger } from "@/api/types";

export type JobTransition = {
  from: JobStatus;
  trigger: JobTrigger;
  to: JobStatus;
  /** Every actor the backend accepts this trigger from. */
  actors: readonly JobActor[];
};

/**
 * Exactly the twelve rows of the §6 table, in its order. Changing this without
 * changing that table, or the reverse, fails the test.
 *
 * Two rows are easy to misread. `estimate_sent → arrived` is a decline, and is
 * the only cycle in the machine — a job can visit `arrived` more than once.
 * `arrived → completed` is a visit that ends with no approved estimate, where
 * only the service-call fee is owed.
 */
export const JOB_TRANSITIONS: readonly JobTransition[] = [
  {
    from: "requested",
    trigger: "accept",
    to: "accepted",
    actors: ["technician", "dispatcher"],
  },
  { from: "requested", trigger: "cancel", to: "cancelled", actors: ["customer"] },
  { from: "requested", trigger: "expire", to: "expired", actors: ["system"] },
  { from: "accepted", trigger: "depart", to: "en_route", actors: ["technician"] },
  { from: "en_route", trigger: "arrive", to: "arrived", actors: ["technician"] },
  {
    from: "arrived",
    trigger: "estimate",
    to: "estimate_sent",
    actors: ["technician"],
  },
  {
    from: "arrived",
    trigger: "complete",
    to: "completed",
    actors: ["technician"],
  },
  {
    from: "estimate_sent",
    trigger: "approve_estimate",
    to: "approved",
    actors: ["customer"],
  },
  {
    from: "estimate_sent",
    trigger: "decline_estimate",
    to: "arrived",
    actors: ["customer"],
  },
  { from: "approved", trigger: "start", to: "in_progress", actors: ["technician"] },
  {
    from: "in_progress",
    trigger: "complete",
    to: "completed",
    actors: ["technician"],
  },
  { from: "completed", trigger: "pay", to: "paid", actors: ["customer"] },
];

/**
 * No transition leads out of these. Polling stops here (§6), and step 5's hooks
 * read this rather than naming the states again.
 *
 * The test derives the same set from the table and fails if they diverge, so a
 * new state with no outgoing row cannot be left out of this list.
 */
export const TERMINAL_STATUSES = [
  "paid",
  "cancelled",
  "expired",
] as const satisfies readonly JobStatus[];

export function isTerminal(status: JobStatus): boolean {
  return (TERMINAL_STATUSES as readonly JobStatus[]).includes(status);
}

/**
 * The intents a signed-in user of this app may trigger right now.
 *
 * Takes `AppRole`, not `JobActor`: `dispatcher` belongs to the Next.js
 * dashboard and `system` is the backend's own response timer, so neither may
 * ever produce a button here. Narrowing the parameter makes that a compile-time
 * guarantee rather than a convention.
 *
 * The `expire` check is what narrows `JobTrigger` to `JobIntent`. It is also
 * redundant at runtime — that row's only actor is `system`, which an `AppRole`
 * can never match — and that redundancy is the point: a server-initiated
 * transition cannot reach a screen even if its actors are edited later.
 */
export function actionsFor(status: JobStatus, role: AppRole): JobIntent[] {
  const intents: JobIntent[] = [];
  for (const transition of JOB_TRANSITIONS) {
    if (transition.from !== status) continue;
    if (!transition.actors.includes(role)) continue;
    if (transition.trigger === "expire") continue;
    intents.push(transition.trigger);
  }
  return intents;
}

/**
 * What the job becomes if the server accepts this trigger — for optimistic copy
 * ("Telling them you're on the way…"), never for an optimistic cache write.
 * Status is server-owned; the app applies what comes back.
 *
 * Null when the pairing is not in the table, which means the screen offered
 * something it should not have.
 */
export function resultOf(status: JobStatus, trigger: JobTrigger): JobStatus | null {
  const match = JOB_TRANSITIONS.find(
    (transition) => transition.from === status && transition.trigger === trigger,
  );
  return match?.to ?? null;
}
