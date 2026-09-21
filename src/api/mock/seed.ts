/**
 * Seed data, ported from `reference/pynaro-mvp/lib/pynaro-data.ts`: 12
 * categories, 5 businesses, 10 technicians and the platform settings.
 *
 * The prototype quotes money in dollars (`serviceCallFee: 75`) because its API
 * divides its own cents by 100 on the way out. These are the cents.
 */
import type { SocialProvider } from "../contract";
import type {
  Business,
  Category,
  Job,
  PlatformSettings,
  SessionUser,
  Technician,
} from "../types";

export const USD = "USD";

/** The one customer the prototype has. Every seeded job belongs to them. */
export const SEED_CUSTOMER = {
  id: "arman",
  name: "Arman G.",
  phone: "(424) 888-5555",
  cardLast4: "4242",
} as const;

/**
 * The accounts the mock starts with. `signUp` appends to this list at runtime,
 * which is why the store copies it rather than reading it in place.
 *
 * There is no role picker — §2 is explicit that the prototype's was a demo
 * control and does not ship — so the role has to arrive from the server, which
 * means the credentials have to differ. Signing in as Marcus lands in the
 * technician group because the server said technician, not because the app
 * offered a choice.
 *
 * Marcus rather than any other technician: he is assigned `job-seed-en-route`,
 * so a technician session opens onto a job it can actually act on.
 */
export type MockAccount = {
  email: string;
  /**
   * Plain text, on purpose. A mock that hashed would be pretending.
   *
   * Null for an account that only exists behind Apple or Google. Those have no
   * password to get wrong, and `signIn` has to refuse them rather than compare
   * against nothing — which is the same rule a real backend needs, and the
   * reason this is nullable instead of an empty string.
   */
  password: string | null;
  /** The provider `signInWithProvider` matches on. Null for an email account. */
  provider: SocialProvider | null;
  user: SessionUser;
};

export const seedAccounts: readonly MockAccount[] = [
  {
    email: "arman@pynaro.test",
    password: "pynaro",
    provider: null,
    user: {
      id: SEED_CUSTOMER.id,
      role: "customer",
      name: SEED_CUSTOMER.name,
      email: "arman@pynaro.test",
      phone: SEED_CUSTOMER.phone,
      businessId: null,
    },
  },
  {
    email: "marcus@andys.test",
    password: "pynaro",
    provider: null,
    user: {
      id: "marcus",
      role: "technician",
      name: "Marcus Reed",
      email: "marcus@andys.test",
      phone: "(424) 888-1210",
      businessId: "andys",
    },
  },
  /**
   * One account per provider, so "Continue with Apple" produces a real session
   * for a real identity rather than signing everyone in as Arman.
   *
   * Both are customers with no jobs, which is the state a genuinely new social
   * sign-up lands in — and the empty-list state steps 8 and 11 have to render
   * anyway. The Apple address is a private-relay one because that is what Apple
   * actually returns when the user hides their email.
   */
  {
    email: "x7k2p9@privaterelay.appleid.test",
    password: null,
    provider: "apple",
    user: {
      id: "apple-demo",
      role: "customer",
      name: "Alex Rivera",
      email: "x7k2p9@privaterelay.appleid.test",
      phone: "",
      businessId: null,
    },
  },
  {
    email: "dana.k@pynaro.test",
    password: null,
    provider: "google",
    user: {
      id: "google-demo",
      role: "customer",
      name: "Dana Kim",
      email: "dana.k@pynaro.test",
      phone: "",
      businessId: null,
    },
  },
];

export const seedCategories: readonly Category[] = [
  {
    id: "plumbing",
    name: "Plumbing",
    description: "Leaks, clogs, heaters & pipes",
    icon: "droplets",
    accent: "#3f9ee8",
  },
  {
    id: "hvac",
    name: "HVAC",
    description: "Heating, cooling & air quality",
    icon: "snowflake",
    accent: "#6878e8",
  },
  {
    id: "locksmith",
    name: "Locksmith",
    description: "Lockouts, locks & keys",
    icon: "key",
    accent: "#e89a3f",
  },
  {
    id: "electrical",
    name: "Electrical",
    description: "Power, panels & lighting",
    icon: "zap",
    accent: "#e6b63d",
  },
  {
    id: "appliance",
    name: "Appliance",
    description: "Kitchen & laundry repair",
    icon: "washer",
    accent: "#986fda",
  },
  {
    id: "cleaning",
    name: "Cleaning",
    description: "Home & commercial cleaning",
    icon: "sparkles",
    accent: "#dd73a1",
  },
  {
    id: "handyman",
    name: "Handyman",
    description: "Repairs, mounting & assembly",
    icon: "hammer",
    accent: "#c8754e",
  },
  {
    id: "garage",
    name: "Garage Door",
    description: "Doors, springs & openers",
    icon: "warehouse",
    accent: "#75899d",
  },
  {
    id: "pest",
    name: "Pest Control",
    description: "Inspection & treatment",
    icon: "bug",
    accent: "#7d9f50",
  },
  {
    id: "auto",
    name: "Mobile Auto",
    description: "Roadside & mobile repair",
    icon: "car",
    accent: "#e6665f",
  },
  {
    id: "roofing",
    name: "Roofing",
    description: "Leaks, inspection & repair",
    icon: "house",
    accent: "#896957",
  },
  {
    id: "landscaping",
    name: "Landscaping",
    description: "Yard care & irrigation",
    icon: "trees",
    accent: "#48a071",
  },
];

export const seedBusinesses: readonly Business[] = [
  {
    id: "andys",
    name: "Andy's Plumbing",
    rating: 4.9,
    reviewCount: 128,
    serviceCallFee: 7500,
    currency: USD,
    tradeIds: ["plumbing", "hvac"],
    color: "#075cf2",
    verified: true,
    insured: true,
  },
  {
    id: "securenow",
    name: "SecureNow Locksmiths",
    rating: 4.8,
    reviewCount: 692,
    serviceCallFee: 6900,
    currency: USD,
    tradeIds: ["locksmith", "garage"],
    color: "#6f5aba",
    verified: true,
    insured: true,
  },
  {
    id: "brightline",
    name: "BrightLine Home Services",
    rating: 4.7,
    reviewCount: 941,
    serviceCallFee: 7900,
    currency: USD,
    tradeIds: ["electrical", "appliance", "handyman"],
    color: "#c57c32",
    verified: true,
    insured: true,
  },
  {
    id: "homehalo",
    name: "HomeHalo Services",
    rating: 4.9,
    reviewCount: 407,
    serviceCallFee: 4900,
    currency: USD,
    tradeIds: ["cleaning", "pest", "roofing", "landscaping"],
    color: "#4b8d61",
    verified: true,
    insured: true,
  },
  {
    id: "roadready",
    name: "RoadReady Mobile Auto",
    rating: 4.8,
    reviewCount: 533,
    serviceCallFee: 7500,
    currency: USD,
    tradeIds: ["auto"],
    color: "#bd5551",
    verified: true,
    insured: true,
  },
];

export const seedTechnicians: readonly Technician[] = [
  {
    id: "marcus",
    businessId: "andys",
    name: "Marcus Reed",
    initials: "MR",
    tradeIds: ["plumbing", "hvac"],
    status: "available",
    eta: 8,
    rating: 4.9,
    jobsCompleted: 846,
    skills: ["Emergency leaks", "Tankless heaters", "Drain clearing"],
  },
  {
    id: "elena",
    businessId: "andys",
    name: "Elena Torres",
    initials: "ET",
    tradeIds: ["plumbing"],
    status: "driving",
    eta: 14,
    rating: 5,
    jobsCompleted: 612,
    skills: ["Main lines", "Leak detection", "Repipes"],
  },
  {
    id: "daniel",
    businessId: "andys",
    name: "Daniel Kim",
    initials: "DK",
    tradeIds: ["hvac"],
    status: "available",
    eta: 12,
    rating: 4.8,
    jobsCompleted: 438,
    skills: ["AC diagnostics", "Heat pumps", "Air quality"],
  },
  {
    id: "omar",
    businessId: "securenow",
    name: "Omar Lewis",
    initials: "OL",
    tradeIds: ["locksmith", "garage"],
    status: "available",
    eta: 6,
    rating: 4.9,
    jobsCompleted: 1022,
    skills: ["Home lockouts", "Rekeying", "Smart locks"],
  },
  {
    id: "sam",
    businessId: "securenow",
    name: "Sam Patel",
    initials: "SP",
    tradeIds: ["locksmith"],
    status: "available",
    eta: 11,
    rating: 4.7,
    jobsCompleted: 519,
    skills: ["Auto lockouts", "Key cutting", "Safe opening"],
  },
  {
    id: "jon",
    businessId: "brightline",
    name: "Jon Bell",
    initials: "JB",
    tradeIds: ["electrical", "handyman"],
    status: "available",
    eta: 10,
    rating: 4.8,
    jobsCompleted: 693,
    skills: ["Panels", "Outlets", "Lighting"],
  },
  {
    id: "maya",
    businessId: "brightline",
    name: "Maya Brooks",
    initials: "MB",
    tradeIds: ["appliance", "handyman"],
    status: "available",
    eta: 15,
    rating: 4.8,
    jobsCompleted: 356,
    skills: ["Washers", "Refrigerators", "Dishwashers"],
  },
  {
    id: "lina",
    businessId: "homehalo",
    name: "Lina Chen",
    initials: "LC",
    tradeIds: ["cleaning", "pest"],
    status: "available",
    eta: 18,
    rating: 5,
    jobsCompleted: 481,
    skills: ["Deep cleaning", "Move-out", "Eco-safe treatment"],
  },
  {
    id: "alex",
    businessId: "homehalo",
    name: "Alex Rivera",
    initials: "AR",
    tradeIds: ["landscaping", "roofing"],
    status: "available",
    eta: 21,
    rating: 4.7,
    jobsCompleted: 296,
    skills: ["Irrigation", "Roof patches", "Gutter repair"],
  },
  {
    id: "victor",
    businessId: "roadready",
    name: "Victor Grant",
    initials: "VG",
    tradeIds: ["auto"],
    status: "available",
    eta: 9,
    rating: 4.9,
    jobsCompleted: 774,
    skills: ["Battery service", "Diagnostics", "Roadside repair"],
  },
];

export const seedSettings: PlatformSettings = {
  feePercent: 12,
  emergencyResponseSeconds: 120,
  immediateResponseSeconds: 300,
  preciseLocationAfterAcceptance: true,
};

/**
 * A little job history, so the screens built from step 8 on have something to
 * render before the request wizard exists. Not in the prototype — its database
 * starts empty — but an empty store makes every list screen a blank slate.
 *
 * Timestamps are relative to `now` so the fixtures never go stale: the
 * `requested` job is always expiring soon, the paid one is always last week.
 */
export function seedJobs(now: Date): Job[] {
  const minutes = (n: number) => new Date(now.getTime() + n * 60_000).toISOString();
  const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();

  return [
    {
      id: "job-seed-requested",
      displayId: "PY-100241",
      customerName: SEED_CUSTOMER.name,
      customerPhone: SEED_CUSTOMER.phone,
      categoryId: "locksmith",
      problem: "Locked out of the front door, key snapped in the cylinder.",
      urgency: "emergency",
      scheduledFor: null,
      address: "1420 Ocean Park Blvd",
      unit: "3B",
      accessNotes: "Buzzer is broken, call on arrival.",
      status: "requested",
      expiresAt: minutes(2),
      requestedBusinessId: "securenow",
      businessId: null,
      technicianId: null,
      currency: USD,
      serviceCallFee: 6900,
      estimateItems: [],
      estimateTotal: 0,
      pynaroFee: 0,
      tip: 0,
      paymentStatus: "authorized",
      cardLast4: SEED_CUSTOMER.cardLast4,
      rating: null,
      review: null,
      events: [
        {
          id: "ev-seed-1",
          at: minutes(-1),
          label: "Request created",
          detail: `Card verified •••• ${SEED_CUSTOMER.cardLast4}`,
        },
      ],
      createdAt: minutes(-1),
      updatedAt: minutes(-1),
    },
    {
      id: "job-seed-en-route",
      displayId: "PY-100238",
      customerName: SEED_CUSTOMER.name,
      customerPhone: SEED_CUSTOMER.phone,
      categoryId: "plumbing",
      problem: "Water pooling under the kitchen sink since this morning.",
      urgency: "now",
      scheduledFor: null,
      address: "1420 Ocean Park Blvd",
      unit: "3B",
      accessNotes: "Buzzer is broken, call on arrival.",
      status: "en_route",
      expiresAt: null,
      requestedBusinessId: "andys",
      businessId: "andys",
      technicianId: "marcus",
      currency: USD,
      serviceCallFee: 7500,
      estimateItems: [],
      estimateTotal: 0,
      pynaroFee: 0,
      tip: 0,
      paymentStatus: "authorized",
      cardLast4: SEED_CUSTOMER.cardLast4,
      rating: null,
      review: null,
      events: [
        {
          id: "ev-seed-2",
          at: minutes(-24),
          label: "Request created",
          detail: `Card verified •••• ${SEED_CUSTOMER.cardLast4}`,
        },
        {
          id: "ev-seed-3",
          at: minutes(-20),
          label: "Accepted by Andy's Plumbing",
          detail: "Marcus Reed assigned · 8 min ETA",
        },
        { id: "ev-seed-4", at: minutes(-6), label: "Technician en route", detail: null },
      ],
      createdAt: minutes(-24),
      updatedAt: minutes(-6),
    },
    {
      id: "job-seed-paid",
      displayId: "PY-100115",
      customerName: SEED_CUSTOMER.name,
      customerPhone: SEED_CUSTOMER.phone,
      categoryId: "electrical",
      problem: "Kitchen outlets dead after the breaker tripped twice.",
      urgency: "scheduled",
      scheduledFor: days(-7),
      address: "1420 Ocean Park Blvd",
      unit: "3B",
      accessNotes: "",
      status: "paid",
      expiresAt: null,
      requestedBusinessId: "brightline",
      businessId: "brightline",
      technicianId: "jon",
      currency: USD,
      serviceCallFee: 7900,
      estimateItems: [
        { description: "GFCI outlet replacement", quantity: 2, unitPrice: 8500 },
        { description: "Circuit diagnostic", quantity: 1, unitPrice: 12000 },
      ],
      estimateTotal: 29000,
      // 12% of the 36900 pre-tip total.
      pynaroFee: 4428,
      tip: 4000,
      paymentStatus: "paid",
      cardLast4: SEED_CUSTOMER.cardLast4,
      rating: 5,
      review: "Jon found the fault in ten minutes and explained the fix.",
      events: [
        {
          id: "ev-seed-5",
          at: days(-7),
          label: "Request created",
          detail: `Card verified •••• ${SEED_CUSTOMER.cardLast4}`,
        },
        {
          id: "ev-seed-6",
          at: days(-7),
          label: "Accepted by BrightLine Home Services",
          detail: "Jon Bell assigned · 10 min ETA",
        },
        {
          id: "ev-seed-7",
          at: days(-7),
          label: "Estimate approved by customer",
          detail: "$290.00 approved",
        },
        { id: "ev-seed-8", at: days(-7), label: "Work completed", detail: null },
        {
          id: "ev-seed-9",
          at: days(-7),
          label: "Payment completed",
          detail: `Charged to •••• ${SEED_CUSTOMER.cardLast4}`,
        },
      ],
      createdAt: days(-7),
      updatedAt: days(-7),
    },
  ];
}
