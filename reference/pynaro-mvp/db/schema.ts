import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  displayId: text("display_id").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  categoryId: text("category_id").notNull(),
  problem: text("problem").notNull(),
  urgency: text("urgency").notNull(),
  address: text("address").notNull(),
  unit: text("unit").notNull().default(""),
  accessNotes: text("access_notes").notNull().default(""),
  scheduledFor: text("scheduled_for"),
  status: text("status").notNull().default("requested"),
  requestedBusinessId: text("requested_business_id"),
  businessId: text("business_id"),
  technicianId: text("technician_id"),
  serviceCallFee: integer("service_call_fee").notNull().default(0),
  estimateItems: text("estimate_items").notNull().default("[]"),
  estimateTotal: integer("estimate_total").notNull().default(0),
  pynaroFee: integer("pynaro_fee").notNull().default(0),
  tip: integer("tip").notNull().default(0),
  paymentStatus: text("payment_status").notNull().default("authorized"),
  cardLast4: text("card_last_4").notNull().default("4242"),
  rating: integer("rating"),
  review: text("review"),
  events: text("events").notNull().default("[]"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const platformSettings = sqliteTable("platform_settings", {
  id: integer("id").primaryKey(),
  feePercent: integer("fee_percent").notNull().default(12),
  emergencyResponseSeconds: integer("emergency_response_seconds")
    .notNull()
    .default(120),
  immediateResponseSeconds: integer("immediate_response_seconds")
    .notNull()
    .default(300),
  preciseLocationAfterAcceptance: integer(
    "precise_location_after_acceptance",
    { mode: "boolean" },
  )
    .notNull()
    .default(true),
});
