export type Category = {
  id: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
};

export type Business = {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  serviceCallFee: number;
  tradeIds: string[];
  color: string;
  verified: boolean;
  insured: boolean;
};

export type Technician = {
  id: string;
  businessId: string;
  name: string;
  initials: string;
  tradeIds: string[];
  status: "available" | "driving" | "on_job" | "break" | "offline";
  eta: number;
  rating: number;
  jobsCompleted: number;
  skills: string[];
};

export const categories: Category[] = [
  { id: "plumbing", name: "Plumbing", description: "Leaks, clogs, heaters & pipes", icon: "droplets", accent: "#3f9ee8" },
  { id: "hvac", name: "HVAC", description: "Heating, cooling & air quality", icon: "snowflake", accent: "#6878e8" },
  { id: "locksmith", name: "Locksmith", description: "Lockouts, locks & keys", icon: "key", accent: "#e89a3f" },
  { id: "electrical", name: "Electrical", description: "Power, panels & lighting", icon: "zap", accent: "#e6b63d" },
  { id: "appliance", name: "Appliance", description: "Kitchen & laundry repair", icon: "washer", accent: "#986fda" },
  { id: "cleaning", name: "Cleaning", description: "Home & commercial cleaning", icon: "sparkles", accent: "#dd73a1" },
  { id: "handyman", name: "Handyman", description: "Repairs, mounting & assembly", icon: "hammer", accent: "#c8754e" },
  { id: "garage", name: "Garage Door", description: "Doors, springs & openers", icon: "warehouse", accent: "#75899d" },
  { id: "pest", name: "Pest Control", description: "Inspection & treatment", icon: "bug", accent: "#7d9f50" },
  { id: "auto", name: "Mobile Auto", description: "Roadside & mobile repair", icon: "car", accent: "#e6665f" },
  { id: "roofing", name: "Roofing", description: "Leaks, inspection & repair", icon: "house", accent: "#896957" },
  { id: "landscaping", name: "Landscaping", description: "Yard care & irrigation", icon: "trees", accent: "#48a071" },
];

export const businesses: Business[] = [
  { id: "andys", name: "Andy's Plumbing", rating: 4.9, reviews: 128, serviceCallFee: 75, tradeIds: ["plumbing", "hvac"], color: "#075cf2", verified: true, insured: true },
  { id: "securenow", name: "SecureNow Locksmiths", rating: 4.8, reviews: 692, serviceCallFee: 69, tradeIds: ["locksmith", "garage"], color: "#6f5aba", verified: true, insured: true },
  { id: "brightline", name: "BrightLine Home Services", rating: 4.7, reviews: 941, serviceCallFee: 79, tradeIds: ["electrical", "appliance", "handyman"], color: "#c57c32", verified: true, insured: true },
  { id: "homehalo", name: "HomeHalo Services", rating: 4.9, reviews: 407, serviceCallFee: 49, tradeIds: ["cleaning", "pest", "roofing", "landscaping"], color: "#4b8d61", verified: true, insured: true },
  { id: "roadready", name: "RoadReady Mobile Auto", rating: 4.8, reviews: 533, serviceCallFee: 75, tradeIds: ["auto"], color: "#bd5551", verified: true, insured: true },
];

export const technicians: Technician[] = [
  { id: "marcus", businessId: "andys", name: "Marcus Reed", initials: "MR", tradeIds: ["plumbing", "hvac"], status: "available", eta: 8, rating: 4.9, jobsCompleted: 846, skills: ["Emergency leaks", "Tankless heaters", "Drain clearing"] },
  { id: "elena", businessId: "andys", name: "Elena Torres", initials: "ET", tradeIds: ["plumbing"], status: "driving", eta: 14, rating: 5, jobsCompleted: 612, skills: ["Main lines", "Leak detection", "Repipes"] },
  { id: "daniel", businessId: "andys", name: "Daniel Kim", initials: "DK", tradeIds: ["hvac"], status: "available", eta: 12, rating: 4.8, jobsCompleted: 438, skills: ["AC diagnostics", "Heat pumps", "Air quality"] },
  { id: "omar", businessId: "securenow", name: "Omar Lewis", initials: "OL", tradeIds: ["locksmith", "garage"], status: "available", eta: 6, rating: 4.9, jobsCompleted: 1022, skills: ["Home lockouts", "Rekeying", "Smart locks"] },
  { id: "sam", businessId: "securenow", name: "Sam Patel", initials: "SP", tradeIds: ["locksmith"], status: "available", eta: 11, rating: 4.7, jobsCompleted: 519, skills: ["Auto lockouts", "Key cutting", "Safe opening"] },
  { id: "jon", businessId: "brightline", name: "Jon Bell", initials: "JB", tradeIds: ["electrical", "handyman"], status: "available", eta: 10, rating: 4.8, jobsCompleted: 693, skills: ["Panels", "Outlets", "Lighting"] },
  { id: "maya", businessId: "brightline", name: "Maya Brooks", initials: "MB", tradeIds: ["appliance", "handyman"], status: "available", eta: 15, rating: 4.8, jobsCompleted: 356, skills: ["Washers", "Refrigerators", "Dishwashers"] },
  { id: "lina", businessId: "homehalo", name: "Lina Chen", initials: "LC", tradeIds: ["cleaning", "pest"], status: "available", eta: 18, rating: 5, jobsCompleted: 481, skills: ["Deep cleaning", "Move-out", "Eco-safe treatment"] },
  { id: "alex", businessId: "homehalo", name: "Alex Rivera", initials: "AR", tradeIds: ["landscaping", "roofing"], status: "available", eta: 21, rating: 4.7, jobsCompleted: 296, skills: ["Irrigation", "Roof patches", "Gutter repair"] },
  { id: "victor", businessId: "roadready", name: "Victor Grant", initials: "VG", tradeIds: ["auto"], status: "available", eta: 9, rating: 4.9, jobsCompleted: 774, skills: ["Battery service", "Diagnostics", "Roadside repair"] },
];

export const statusLabels: Record<string, string> = {
  requested: "Awaiting response",
  accepted: "Accepted",
  en_route: "Professional en route",
  arrived: "Professional arrived",
  estimate_sent: "Estimate ready",
  approved: "Estimate approved",
  in_progress: "Work in progress",
  completed: "Work completed",
  paid: "Paid & closed",
  cancelled: "Cancelled",
};
