/**
 * The mock's job state machine — the server's copy, not the app's.
 *
 * `src/domain/job-transitions.ts` holds the app's copy, which drives
 * affordances only. This one decides what actually happens, so the two are
 * deliberately separate objects: if the mock imported the app's table, the
 * client could never be wrong about a transition and the `409` path in §6 would
 * be unreachable by construction. `machine.test.ts` asserts both agree with §6.
 *
 * Effects live on the row rather than in a switch elsewhere, so a rule and its
 * consequence cannot drift apart.
 */
import type {
  Business,
  Cents,
  EstimateItem,
  EventItem,
  Job,
  JobActor,
  JobStatus,
  JobTrigger,
  PlatformSettings,
  Technician,
} from "../types";
import type { Actor } from "../contract";

export type TransitionPayload = {
  items?: readonly EstimateItem[];
  tip?: Cents;
};

export type TransitionContext = {
  actor: Actor;
  now: Date;
  settings: PlatformSettings;
  businesses: readonly Business[];
  technicians: readonly Technician[];
  payload: TransitionPayload;
  /** Monotonic id source, so seeded runs are reproducible. */
  nextId: (prefix: string) => string;
};

export type MockTransition = {
  from: JobStatus;
  trigger: JobTrigger;
  to: JobStatus;
  actors: readonly JobActor[];
  /** Mutates the job in place. Runs only once every guard has passed. */
  apply?: (job: Job, ctx: TransitionContext) => void;
};

function addEvent(
  job: Job,
  ctx: TransitionContext,
  label: string,
  detail: string | null = null,
): void {
  const event: EventItem = {
    id: ctx.nextId("ev"),
    at: ctx.now.toISOString(),
    label,
    detail,
  };
  job.events = [...job.events, event];
}

/** Dollars-and-cents for an event detail string. Display only. */
function money(cents: Cents): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export const MOCK_TRANSITIONS: readonly MockTransition[] = [
  {
    from: "requested",
    trigger: "accept",
    to: "accepted",
    actors: ["technician", "dispatcher"],
    apply(job, ctx) {
      const technician = ctx.technicians.find((t) => t.id === ctx.actor.id);
      const business = ctx.businesses.find((b) => b.id === technician?.businessId);
      job.technicianId = technician?.id ?? null;
      job.businessId = business?.id ?? null;
      // The window only applies while nobody has answered.
      job.expiresAt = null;
      addEvent(
        job,
        ctx,
        `Accepted by ${business?.name ?? "provider"}`,
        technician ? `${technician.name} assigned · ${technician.eta} min ETA` : null,
      );
    },
  },
  {
    from: "requested",
    trigger: "cancel",
    to: "cancelled",
    actors: ["customer"],
    apply(job, ctx) {
      job.expiresAt = null;
      addEvent(job, ctx, "Request cancelled", "Cancelled by customer");
    },
  },
  {
    from: "requested",
    trigger: "expire",
    to: "expired",
    actors: ["system"],
    apply(job, ctx) {
      job.expiresAt = null;
      addEvent(job, ctx, "Request expired", "No provider responded in time");
    },
  },
  {
    from: "accepted",
    trigger: "depart",
    to: "en_route",
    actors: ["technician"],
    apply(job, ctx) {
      addEvent(job, ctx, "Technician en route", null);
    },
  },
  {
    from: "en_route",
    trigger: "arrive",
    to: "arrived",
    actors: ["technician"],
    apply(job, ctx) {
      addEvent(job, ctx, "Technician arrived", null);
    },
  },
  {
    from: "arrived",
    trigger: "estimate",
    to: "estimate_sent",
    actors: ["technician"],
    apply(job, ctx) {
      const items = ctx.payload.items ?? [];
      job.estimateItems = items.map((item) => ({ ...item }));
      job.estimateTotal = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );
      addEvent(
        job,
        ctx,
        "Estimate sent",
        `${money(job.estimateTotal)} awaiting customer approval`,
      );
    },
  },
  {
    from: "arrived",
    trigger: "complete",
    to: "completed",
    actors: ["technician"],
    apply(job, ctx) {
      // No estimate was ever approved, so only the service call is owed. The
      // total in §9 is estimate + service call + tip, and the estimate is zero.
      addEvent(job, ctx, "Work completed", "No estimate — service call only");
    },
  },
  {
    from: "estimate_sent",
    trigger: "approve_estimate",
    to: "approved",
    actors: ["customer"],
    apply(job, ctx) {
      addEvent(
        job,
        ctx,
        "Estimate approved by customer",
        `${money(job.estimateTotal)} approved`,
      );
    },
  },
  {
    from: "estimate_sent",
    trigger: "decline_estimate",
    to: "arrived",
    actors: ["customer"],
    apply(job, ctx) {
      const declined = job.estimateTotal;
      // Cleared so the next estimate replaces rather than adds to it. The
      // timeline keeps the record of what was declined.
      job.estimateItems = [];
      job.estimateTotal = 0;
      addEvent(
        job,
        ctx,
        "Estimate declined",
        `${money(declined)} declined · technician still on site`,
      );
    },
  },
  {
    from: "approved",
    trigger: "start",
    to: "in_progress",
    actors: ["technician"],
    apply(job, ctx) {
      addEvent(job, ctx, "Work started", null);
    },
  },
  {
    from: "in_progress",
    trigger: "complete",
    to: "completed",
    actors: ["technician"],
    apply(job, ctx) {
      addEvent(job, ctx, "Work completed", null);
    },
  },
  {
    from: "completed",
    trigger: "pay",
    to: "paid",
    actors: ["customer"],
    apply(job, ctx) {
      const tip = ctx.payload.tip ?? 0;
      const totalBeforeTip = job.estimateTotal + job.serviceCallFee;
      job.tip = tip;
      // The platform keeps feePercent of the pre-tip total (§9). The tip is the
      // technician's and is never part of the fee base.
      job.pynaroFee = Math.round((totalBeforeTip * ctx.settings.feePercent) / 100);
      job.paymentStatus = "paid";
      addEvent(job, ctx, "Payment completed", `Charged to •••• ${job.cardLast4}`);
    },
  },
];

export function findTransition(
  from: JobStatus,
  trigger: JobTrigger,
): MockTransition | null {
  return MOCK_TRANSITIONS.find((t) => t.from === from && t.trigger === trigger) ?? null;
}

/** Every trigger legal from this state, whoever the actor. */
export function triggersFrom(from: JobStatus): JobTrigger[] {
  return MOCK_TRANSITIONS.filter((t) => t.from === from).map((t) => t.trigger);
}
