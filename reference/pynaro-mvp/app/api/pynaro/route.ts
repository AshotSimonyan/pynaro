import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { jobs, platformSettings } from "@/db/schema";
import { businesses, categories, technicians } from "@/lib/pynaro-data";

type EventItem = { id: string; at: string; label: string; detail?: string };

const requestSchema = z.object({
  action: z.literal("create_job"),
  categoryId: z.string().min(1),
  problem: z.string().trim().min(8).max(500),
  urgency: z.enum(["emergency", "now", "scheduled"]),
  address: z.string().trim().min(5).max(250),
  unit: z.string().trim().max(40).optional().default(""),
  accessNotes: z.string().trim().max(250).optional().default(""),
  scheduledFor: z.string().optional(),
  requestedBusinessId: z.string().min(1),
});

const updateSchema = z.object({
  action: z.literal("update_job"),
  jobId: z.string().min(1),
  status: z
    .enum([
      "requested",
      "accepted",
      "en_route",
      "arrived",
      "estimate_sent",
      "approved",
      "in_progress",
      "completed",
      "paid",
      "cancelled",
    ])
    .optional(),
  businessId: z.string().optional(),
  technicianId: z.string().optional(),
  paymentStatus: z.string().optional(),
  tip: z.number().min(0).max(1000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  review: z.string().trim().max(500).optional(),
  eventLabel: z.string().trim().min(1).max(120).optional(),
  eventDetail: z.string().trim().max(250).optional(),
});

const estimateSchema = z.object({
  action: z.literal("submit_estimate"),
  jobId: z.string().min(1),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(2).max(160),
        quantity: z.number().int().min(1).max(99),
        unitPrice: z.number().min(0).max(1_000_000),
      }),
    )
    .min(1)
    .max(20),
});

const settingsSchema = z.object({
  action: z.literal("update_settings"),
  feePercent: z.number().int().min(0).max(50),
  emergencyResponseSeconds: z.number().int().min(30).max(1800),
  immediateResponseSeconds: z.number().int().min(60).max(3600),
  preciseLocationAfterAcceptance: z.boolean(),
});

const parseEvents = (value: string): EventItem[] => {
  try {
    return JSON.parse(value) as EventItem[];
  } catch {
    return [];
  }
};

const presentJob = (job: typeof jobs.$inferSelect) => ({
  ...job,
  serviceCallFee: job.serviceCallFee / 100,
  estimateTotal: job.estimateTotal / 100,
  pynaroFee: job.pynaroFee / 100,
  tip: job.tip / 100,
  estimateItems: JSON.parse(job.estimateItems) as {
    description: string;
    quantity: number;
    unitPrice: number;
  }[],
  events: parseEvents(job.events),
});

const errorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("no such table")) {
    return "The Pynaro database is still being prepared. Please refresh in a moment.";
  }
  return message;
};

export async function GET() {
  try {
    const db = getDb();
    const [jobRows, settingRows] = await Promise.all([
      db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(100),
      db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1),
    ]);
    return Response.json({
      categories,
      businesses,
      technicians,
      jobs: jobRows.map(presentJob),
      settings:
        settingRows[0] ?? {
          id: 1,
          feePercent: 12,
          emergencyResponseSeconds: 120,
          immediateResponseSeconds: 300,
          preciseLocationAfterAcceptance: true,
        },
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const db = getDb();

    if (payload.action === "create_job") {
      const input = requestSchema.parse(payload);
      const business = businesses.find(
        (item) => item.id === input.requestedBusinessId,
      );
      if (!business || !business.tradeIds.includes(input.categoryId)) {
        return Response.json(
          { error: "Selected business does not serve this category" },
          { status: 400 },
        );
      }
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const displayId = `PY-${String(Date.now()).slice(-6)}`;
      const events: EventItem[] = [
        {
          id: crypto.randomUUID(),
          at: now,
          label: "Request created",
          detail: "Card verified •••• 4242",
        },
      ];
      const [created] = await db
        .insert(jobs)
        .values({
          id,
          displayId,
          customerName: "Arman G.",
          customerPhone: "(424) 888-5555",
          categoryId: input.categoryId,
          problem: input.problem,
          urgency: input.urgency,
          address: input.address,
          unit: input.unit,
          accessNotes: input.accessNotes,
          scheduledFor: input.scheduledFor || null,
          requestedBusinessId: input.requestedBusinessId,
          serviceCallFee: Math.round(business.serviceCallFee * 100),
          events: JSON.stringify(events),
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return Response.json({ job: presentJob(created) }, { status: 201 });
    }

    if (payload.action === "update_job") {
      const input = updateSchema.parse(payload);
      const [existing] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, input.jobId))
        .limit(1);
      if (!existing) {
        return Response.json({ error: "Job not found" }, { status: 404 });
      }
      const events = parseEvents(existing.events);
      if (input.eventLabel) {
        events.push({
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          label: input.eventLabel,
          detail: input.eventDetail,
        });
      }
      const feePercent =
        (
          await db
            .select()
            .from(platformSettings)
            .where(eq(platformSettings.id, 1))
            .limit(1)
        )[0]?.feePercent ?? 12;
      const totalBeforeTip = existing.estimateTotal + existing.serviceCallFee;
      const [updated] = await db
        .update(jobs)
        .set({
          ...(input.status ? { status: input.status } : {}),
          ...(input.businessId ? { businessId: input.businessId } : {}),
          ...(input.technicianId ? { technicianId: input.technicianId } : {}),
          ...(input.paymentStatus
            ? { paymentStatus: input.paymentStatus }
            : {}),
          ...(typeof input.tip === "number"
            ? { tip: Math.round(input.tip * 100) }
            : {}),
          ...(typeof input.rating === "number" ? { rating: input.rating } : {}),
          ...(typeof input.review === "string" ? { review: input.review } : {}),
          ...(input.status === "paid"
            ? { pynaroFee: Math.round((totalBeforeTip * feePercent) / 100) }
            : {}),
          events: JSON.stringify(events),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(jobs.id, input.jobId))
        .returning();
      return Response.json({ job: presentJob(updated) });
    }

    if (payload.action === "submit_estimate") {
      const input = estimateSchema.parse(payload);
      const [existing] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, input.jobId))
        .limit(1);
      if (!existing) {
        return Response.json({ error: "Job not found" }, { status: 404 });
      }
      const estimateTotal = input.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );
      const events = parseEvents(existing.events);
      events.push({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        label: "Estimate sent",
        detail: `$${estimateTotal.toFixed(2)} awaiting customer approval`,
      });
      const [updated] = await db
        .update(jobs)
        .set({
          status: "estimate_sent",
          estimateItems: JSON.stringify(input.items),
          estimateTotal: Math.round(estimateTotal * 100),
          events: JSON.stringify(events),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(jobs.id, input.jobId))
        .returning();
      return Response.json({ job: presentJob(updated) });
    }

    if (payload.action === "update_settings") {
      const input = settingsSchema.parse(payload);
      const [updated] = await db
        .insert(platformSettings)
        .values({
          id: 1,
          feePercent: input.feePercent,
          emergencyResponseSeconds: input.emergencyResponseSeconds,
          immediateResponseSeconds: input.immediateResponseSeconds,
          preciseLocationAfterAcceptance:
            input.preciseLocationAfterAcceptance,
        })
        .onConflictDoUpdate({
          target: platformSettings.id,
          set: {
            feePercent: input.feePercent,
            emergencyResponseSeconds: input.emergencyResponseSeconds,
            immediateResponseSeconds: input.immediateResponseSeconds,
            preciseLocationAfterAcceptance:
              input.preciseLocationAfterAcceptance,
          },
        })
        .returning();
      return Response.json({ settings: updated });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
