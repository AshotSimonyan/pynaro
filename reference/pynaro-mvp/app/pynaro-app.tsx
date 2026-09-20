"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bell,
  BriefcaseBusiness,
  Bug,
  CalendarDays,
  Camera,
  CarFront,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  CircleDollarSign,
  CreditCard,
  Droplets,
  Grid2X2,
  Hammer,
  Headphones,
  House,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LocateFixed,
  LockKeyhole,
  MapPin,
  Menu,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Trees,
  UserRound,
  UsersRound,
  Warehouse,
  WashingMachine,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type {
  Business,
  Category,
  Technician,
} from "@/lib/pynaro-data";
import { statusLabels } from "@/lib/pynaro-data";
import { LiveMap } from "./live-map";

type EventItem = { id: string; at: string; label: string; detail?: string };
type EstimateItem = { description: string; quantity: number; unitPrice: number };
type Job = {
  id: string;
  displayId: string;
  customerName: string;
  categoryId: string;
  problem: string;
  urgency: "emergency" | "now" | "scheduled";
  address: string;
  unit: string;
  accessNotes: string;
  status: string;
  requestedBusinessId?: string;
  businessId?: string;
  technicianId?: string;
  serviceCallFee: number;
  estimateItems: EstimateItem[];
  estimateTotal: number;
  pynaroFee: number;
  tip: number;
  paymentStatus: string;
  cardLast4: string;
  rating?: number;
  review?: string;
  events: EventItem[];
  createdAt: string;
};

type MarketplaceState = {
  categories: Category[];
  businesses: Business[];
  technicians: Technician[];
  jobs: Job[];
  settings: {
    feePercent: number;
    emergencyResponseSeconds: number;
    immediateResponseSeconds: number;
    preciseLocationAfterAcceptance: boolean;
  };
};

type Draft = {
  categoryId: string;
  problem: string;
  urgency: "emergency" | "now" | "scheduled";
  address: string;
  unit: string;
  accessNotes: string;
  scheduledFor: string;
  requestedBusinessId: string;
};

type Role = "customer" | "technician" | "business" | "admin";

const iconMap: Record<string, LucideIcon> = {
  droplets: Droplets,
  snowflake: Snowflake,
  key: KeyRound,
  zap: Zap,
  washer: WashingMachine,
  sparkles: Sparkles,
  hammer: Hammer,
  warehouse: Warehouse,
  bug: Bug,
  car: CarFront,
  house: House,
  trees: Trees,
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

function downloadJobsReport(jobs: Job[], state: MarketplaceState) {
  const rows = [["Job", "Service", "Customer", "Status", "Total"], ...jobs.map((job) => [job.displayId, state.categories.find((item) => item.id === job.categoryId)?.name ?? job.categoryId, job.customerName, statusLabels[job.status], String(job.estimateTotal + job.serviceCallFee + job.tip)])];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "pynaro-jobs-report.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

const postAction = async <T,>(body: Record<string, unknown>): Promise<T> => {
  const response = await fetch("/api/pynaro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
};

function Logo() {
  return (
    <div className="pynaro-logo">
      <img src="/pynaro-mark.svg" alt="" />
      <div><strong>PYNARO</strong><small>THE RIGHT PRO. RIGHT NEARBY.</small></div>
    </div>
  );
}

function CategoryIcon({ category, size = 22 }: { category: Category; size?: number }) {
  const Icon = iconMap[category.icon] ?? Wrench;
  return (
    <span
      className="category-icon"
      style={{ color: category.accent, backgroundColor: `${category.accent}18` }}
    >
      <Icon size={size} />
    </span>
  );
}

function PersonAvatar({ name, color = "#2d7d70" }: { name: string; color?: string }) {
  const initials = name.split(" ").map((word) => word[0]).slice(0, 2).join("");
  return (
    <Avatar className="person-avatar" style={{ backgroundColor: color }}>
      <AvatarFallback style={{ backgroundColor: color }}>{initials}</AvatarFallback>
    </Avatar>
  );
}

function MapSurface({ businesses = 3 }: { businesses?: number }) {
  return (
    <div className="map-surface" aria-label="Approximate nearby professionals map">
      <i className="road road-a" /><i className="road road-b" />
      <i className="road road-c" /><i className="road road-d" />
      <span className="area-label area-one">Van Nuys</span>
      <span className="area-label area-two">Sherman Oaks</span>
      <span className="customer-pin"><House size={15} /></span>
      {Array.from({ length: businesses }).map((_, index) => (
        <span className={`provider-pin provider-${index + 1}`} key={index}>
          <Navigation size={14} />
        </span>
      ))}
      <span className="privacy-map-label"><ShieldCheck size={13} />Approximate locations</span>
    </div>
  );
}

export function PynaroApp() {
  const [state, setState] = useState<MarketplaceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestCategoryId, setRequestCategoryId] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nav, setNav] = useState<"home" | "map" | "bookings" | "messages" | "account">("home");
  const [role, setRole] = useState<Role>("customer");
  const [onboardingStep, setOnboardingStep] = useState<number | null>(0);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/pynaro", { cache: "no-store" });
      const data = (await response.json()) as MarketplaceState & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not load Pynaro");
      setState(data);
      setSelectedJob((current) =>
        current ? data.jobs.find((job) => job.id === current.id) ?? null : null,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load Pynaro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, [refresh]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("pynaro-demo-role") as Role | null;
      if (saved && ["customer", "technician", "business", "admin"].includes(saved)) setRole(saved);
      if (window.sessionStorage.getItem("pynaro-onboarded") === "true") setOnboardingStep(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const switchRole = (next: Role) => {
    setRole(next);
    window.localStorage.setItem("pynaro-demo-role", next);
    if (next === "customer") {
      window.sessionStorage.setItem("pynaro-onboarded", "true");
      setOnboardingStep(null);
      setNav("home");
    }
    setSelectedJob(null);
  };

  if (loading || !state) {
    return (
      <main className="loading-view"><Logo /><Progress value={68} /><p>Finding verified professionals near you…</p></main>
    );
  }

  if (role !== "customer") {
    return (
      <>
        <OperationsApp
          role={role}
          onRoleChange={switchRole}
          state={state}
          refresh={refresh}
          onOpenJob={setSelectedJob}
        />
        <JobDialog
          job={selectedJob}
          state={state}
          open={Boolean(selectedJob)}
          onOpenChange={(open) => !open && setSelectedJob(null)}
          onChanged={refresh}
        />
        <Toaster richColors position="top-center" />
      </>
    );
  }

  if (onboardingStep !== null) {
    return (
      <>
        <OnboardingScreen
          step={onboardingStep}
          onStep={setOnboardingStep}
          onComplete={() => {
            window.sessionStorage.setItem("pynaro-onboarded", "true");
            setOnboardingStep(null);
          }}
          onProfessional={() => switchRole("technician")}
        />
        <Toaster richColors position="top-center" />
      </>
    );
  }

  return (
    <main className="customer-app">
      <header className="customer-header">
        <button className="header-menu" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
        <Logo />
        <div className="header-actions">
          <button className="header-icon" aria-label="Notifications" onClick={() => toast.info("No new notifications")}><Bell size={20} /><i /></button>
          <PersonAvatar name="Arman G" color="#0b5df5" />
        </div>
      </header>

      <div className="customer-main">
        {nav === "home" && (
          <CustomerHome
            state={state}
            onRequest={(categoryId) => { setRequestCategoryId(categoryId ?? ""); setRequestOpen(true); }}
            onOpenMap={() => setNav("map")}
            onOpenJob={setSelectedJob}
          />
        )}
        {nav === "map" && <MapBrowser state={state} onRequest={() => { setRequestCategoryId(""); setRequestOpen(true); }} />}
        {nav === "bookings" && (
          <Bookings state={state} onOpenJob={setSelectedJob} onRequest={() => { setRequestCategoryId(""); setRequestOpen(true); }} />
        )}
        {nav === "messages" && <Messages state={state} onOpenJob={setSelectedJob} />}
        {nav === "account" && <Account role={role} onRoleChange={switchRole} />}
      </div>

      <nav className="bottom-nav" aria-label="Customer navigation">
        {[
          { id: "home" as const, label: "Home", icon: House },
          { id: "map" as const, label: "Map", icon: MapPin },
          { id: "bookings" as const, label: "Bookings", icon: CalendarDays },
          { id: "messages" as const, label: "Messages", icon: MessageCircle },
          { id: "account" as const, label: "Account", icon: UserRound },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} className={nav === id ? "active" : ""} onClick={() => setNav(id)}>
            <Icon size={20} /><span>{label}</span>
          </button>
        ))}
      </nav>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetContent side="left" className="customer-menu"><SheetHeader><Logo /><SheetTitle>Customer menu</SheetTitle><SheetDescription>Open any part of your Pynaro account.</SheetDescription></SheetHeader><div className="customer-menu-links">{[{ id: "home" as const, label: "Home", icon: House }, { id: "map" as const, label: "Live map", icon: MapPin }, { id: "bookings" as const, label: "Bookings", icon: CalendarDays }, { id: "messages" as const, label: "Messages", icon: MessageCircle }, { id: "account" as const, label: "Profile", icon: UserRound }].map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setNav(id); setMenuOpen(false); }}><Icon size={19} />{label}<ChevronRight size={16} /></button>)}</div><div className="customer-menu-role"><RolePicker role={role} onChange={(next) => { switchRole(next); setMenuOpen(false); }} /></div></SheetContent></Sheet>

      <RequestDialog
        key={`${requestOpen}-${requestCategoryId || "all"}`}
        open={requestOpen}
        onOpenChange={setRequestOpen}
        state={state}
        initialCategoryId={requestCategoryId}
        onCreated={(job) => {
          setRequestOpen(false);
          setSelectedJob(job);
          void refresh();
        }}
      />
      <JobDialog
        job={selectedJob}
        state={state}
        open={Boolean(selectedJob)}
        onOpenChange={(open) => !open && setSelectedJob(null)}
        onChanged={refresh}
      />
      <Toaster richColors position="top-center" />
    </main>
  );
}

function OnboardingScreen({ step, onStep, onComplete, onProfessional }: {
  step: number;
  onStep: (step: number) => void;
  onComplete: () => void;
  onProfessional: () => void;
}) {
  const [notifications, setNotifications] = useState(true);
  const [setupAddress, setSetupAddress] = useState("6203 Murietta Ave, Van Nuys, CA 91401");
  return (
    <main className="onboarding-shell">
      <section className={`onboarding-phone onboarding-step-${step}`}>
        {step > 0 && <button className="onboarding-back" onClick={() => onStep(step - 1)} aria-label="Go back"><ArrowLeft size={22} /></button>}
        {step === 0 && (
          <div className="welcome-screen">
            <div className="welcome-brand"><img src="/pynaro-mark.svg" alt="Pynaro" /><strong>PYNARO</strong><span>THE RIGHT PRO. RIGHT NEARBY.</span></div>
            <p>Find trusted local professionals<br />who are available near you.</p>
            <div className="welcome-actions"><Button onClick={() => onStep(1)}>Get Started</Button><Button variant="outline" onClick={() => onStep(1)}>Log In</Button></div>
            <div className="welcome-links"><button onClick={() => toast.info("Choose a service, select one nearby pro, approve the estimate, and track the job in Pynaro.")}><LifeBuoy size={18} />How It Works</button><button onClick={onProfessional}><UserRound size={18} />Are you a service professional?<br /><b>Join Pynaro Pro</b></button></div>
            <small>By continuing, you agree to our <b>Terms</b> &amp; <b>Privacy Policy</b>.</small>
          </div>
        )}
        {step === 1 && (
          <div className="account-screen">
            <h1>Create your account</h1>
            <label><span>Full Name</span><Input defaultValue="Arman Ghazaryan" /></label>
            <label><span>Mobile Number</span><Input defaultValue="(424) 888-5555" /></label>
            <label><span>Email Address</span><Input defaultValue="arman@example.com" /></label>
            <label><span>Password</span><Input type="password" defaultValue="pynaro-demo" /></label>
            <label className="terms-check"><input type="checkbox" defaultChecked />I agree to the <b>Terms of Service</b> and <b>Privacy Policy</b></label>
            <Button className="wide-button" onClick={() => onStep(2)}>Create Account</Button>
            <div className="or-row"><i />or continue with<i /></div>
            <Button variant="outline" className="social-button" onClick={() => { toast.success("Apple account connected"); onStep(2); }}>● &nbsp; Continue with Apple</Button>
            <Button variant="outline" className="social-button" onClick={() => { toast.success("Google account connected"); onStep(2); }}><b className="google-g">G</b> &nbsp; Continue with Google</Button>
            <p>Already have an account? <b>Log In</b></p>
          </div>
        )}
        {step === 2 && (
          <div className="setup-screen">
            <h1>Set up your experience</h1>
            <div className="setup-card location-setup"><img src="/pynaro-mark.svg" alt="" /><div><strong>Enable your location</strong><p>Pynaro uses your location to show nearby professionals and accurate arrival times.</p></div><Button onClick={() => toast.success("Location enabled")}>Allow Location</Button></div>
            <div className="privacy-setup"><LockKeyhole size={24} /><p>Your exact location stays private until you request and confirm a professional.</p></div>
            <div className="setup-card notification-setup"><div><strong>Turn on notifications</strong><p>Get updates on request status, arrival alerts, messages, and receipts.</p></div><Switch checked={notifications} onCheckedChange={setNotifications} /></div>
            <div className="setup-card address-setup"><div><strong>Service address</strong><p>{setupAddress}</p></div><button onClick={() => { const next = window.prompt("Enter your service address", setupAddress); if (next?.trim()) setSetupAddress(next.trim()); }}>Change</button></div>
            <Button className="wide-button" onClick={onComplete}>Continue</Button>
          </div>
        )}
      </section>
    </main>
  );
}

function MapBrowser({ state, onRequest }: { state: MarketplaceState; onRequest: () => void }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");
  const available = state.technicians.filter((technician) => technician.status !== "offline");
  const [selectedTechId, setSelectedTechId] = useState(available[0]?.id ?? "");
  const technician = available.find((item) => item.id === selectedTechId) ?? available[0];
  const business = state.businesses.find((item) => item.id === technician?.businessId) ?? state.businesses[0];
  const category = state.categories.find((item) => technician?.tradeIds.includes(item.id));
  const status = technician?.status === "available" ? "Available Now" : technician?.status === "driving" ? "Driving" : technician?.status === "on_job" ? "On a Job" : "On Break";
  return (
    <><section className="map-browser page-view">
      <div className="page-title"><div><span className="eyebrow">Live availability</span><h1>Professionals near you</h1></div></div>
      <div className="map-choice"><button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>Map</button><button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>List</button></div>
      {view === "map" ? <LiveMap technicians={available} businesses={state.businesses} selectedTechId={technician?.id} onSelectTech={(item) => setSelectedTechId(item.id)} /> : <div className="live-pro-list">{available.map((item) => { const company = state.businesses.find((candidate) => candidate.id === item.businessId)!; return <button key={item.id} className={item.id === technician?.id ? "selected" : ""} onClick={() => setSelectedTechId(item.id)}><PersonAvatar name={item.name} color={company.color} /><span><strong>{item.name}</strong><small>{company.name} · {item.tradeIds.map((id) => state.categories.find((service) => service.id === id)?.name).join(", ")}</small><em><i />{item.status.replace("_", " ")} · {item.eta} min ETA</em></span><ChevronRight size={17} /></button>; })}</div>}
      {technician && <div className={`map-provider-sheet ${view === "list" ? "list-mode" : ""}`}>
        <PersonAvatar name={technician.name} color={business.color} />
        <div><span><strong>{business.name}</strong><BadgeCheck size={15} /></span><small><Star size={13} fill="currentColor" /> {technician.rating} ({business.reviews}) &nbsp; · &nbsp; {(technician.eta * .075).toFixed(1)} mi &nbsp; · &nbsp; {technician.eta} min</small><em><ShieldCheck size={12} /> {technician.name} · Licensed &amp; insured</em></div>
        <Badge>{status}</Badge>
        <Button variant="outline" onClick={() => setProfileOpen(true)}>View Profile</Button><Button onClick={onRequest}>Request Service</Button>
      </div>}
      <p className="map-privacy"><LockKeyhole size={14} />Exact professional location appears after your request is accepted.</p>
    </section><ProviderProfile open={profileOpen} onOpenChange={setProfileOpen} technician={technician} business={business} category={category} onMessage={() => setMessageOpen(true)} onRequest={() => { setProfileOpen(false); onRequest(); }} /><QuickMessageDialog open={messageOpen} onOpenChange={setMessageOpen} recipient={technician?.name ?? business.name} /></>
  );
}

function ProviderProfile({ open, onOpenChange, technician, business, category, onMessage, onRequest }: { open: boolean; onOpenChange: (open: boolean) => void; technician?: Technician; business: Business; category?: Category; onMessage: () => void; onRequest: () => void }) {
  const name = technician?.name ?? business.name;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="provider-profile-dialog" showCloseButton={false}><div className="profile-topbar"><Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}><ArrowLeft size={20} /></Button><Logo /><Button variant="ghost" size="icon" onClick={() => toast.success("Provider saved")}><Store size={19} /></Button></div><div className="provider-hero"><PersonAvatar name={name} color={business.color} /><Badge>{technician?.status === "available" ? "Available Now" : "Currently Busy"}</Badge></div><section className="provider-profile-body"><h1>{business.name} <BadgeCheck size={18} /></h1><div className="credential-row"><span><ShieldCheck size={15} />Licensed &amp; Insured</span><span><ShieldCheck size={15} />Background Checked</span></div><div className="profile-stats"><div><strong><Star size={14} fill="currentColor" />{technician?.rating ?? business.rating}</strong><small>{business.reviews} reviews</small></div><div><strong>{((technician?.eta ?? 8) * .075).toFixed(1)} mi</strong><small>away</small></div><div><strong>{technician?.eta ?? 8} min</strong><small>ETA</small></div><div><strong>{technician?.jobsCompleted ?? 0}+</strong><small>jobs</small></div></div><div className="profile-section"><h2>About</h2><p>{name} is a verified local professional with {business.name}, available for {category?.name.toLowerCase() ?? "home service"} requests nearby.</p></div><div className="profile-section"><h2>Services &amp; Pricing</h2><p><b>{money(business.serviceCallFee)} service call</b> — credited toward approved work. Final repair price is provided after diagnosis.</p></div><div className="profile-section"><h2>Credentials</h2><p><ShieldCheck size={14} /> California Contractor License verified</p><p><ShieldCheck size={14} /> Insurance current</p></div><div className="profile-section"><h2>Recent Reviews</h2><p><b>Sarah M. · ★★★★★</b><br />Arrived quickly, explained the repair clearly, and completed the work professionally.</p></div></section><div className="profile-actions"><Button variant="outline" onClick={() => { window.location.href = "tel:+18185550147"; }}><Phone size={16} />Call</Button><Button variant="outline" onClick={onMessage}><MessageCircle size={16} />Message</Button><Button onClick={onRequest}>Request Service</Button></div></DialogContent></Dialog>;
}

function QuickMessageDialog({ open, onOpenChange, recipient }: { open: boolean; onOpenChange: (open: boolean) => void; recipient: string }) {
  const [messages, setMessages] = useState(["Hi! I’m nearby and can help. What’s happening?"]);
  const [draft, setDraft] = useState("");
  const send = () => { if (!draft.trim()) return; setMessages((current) => [...current, draft.trim()]); setDraft(""); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="message-dialog"><DialogHeader><DialogTitle>Message {recipient}</DialogTitle><DialogDescription>Messages stay attached to your service request.</DialogDescription></DialogHeader><div className="quick-message-thread">{messages.map((message, index) => <p className={index ? "mine" : "theirs"} key={`${message}-${index}`}>{message}</p>)}</div><div className="quick-message-compose"><Input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") send(); }} placeholder="Write a message…" /><Button onClick={send}>Send</Button></div></DialogContent></Dialog>;
}

function RolePicker({ role, onChange }: { role: Role; onChange: (role: Role) => void }) {
  return (
    <div className="role-picker">
      <span>Switch view</span>
      <Select value={role} onValueChange={(value) => onChange(value as Role)}>
        <SelectTrigger aria-label="Choose Pynaro view"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="customer">Customer app</SelectItem>
          <SelectItem value="technician">Technician app</SelectItem>
          <SelectItem value="business">Business owner</SelectItem>
          <SelectItem value="admin">Pynaro admin</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

type OperatorPage =
  | "overview"
  | "requests"
  | "dispatch"
  | "team"
  | "jobs"
  | "earnings"
  | "providers"
  | "categories"
  | "payments"
  | "settings";

function OperationsApp({ role, onRoleChange, state, refresh, onOpenJob }: {
  role: Exclude<Role, "customer">;
  onRoleChange: (role: Role) => void;
  state: MarketplaceState;
  refresh: () => Promise<void>;
  onOpenJob: (job: Job) => void;
}) {
  const [page, setPage] = useState<OperatorPage>("overview");
  const [techId, setTechId] = useState("marcus");
  const [businessId, setBusinessId] = useState("andys");
  const [technicianMenuOpen, setTechnicianMenuOpen] = useState(false);

  useEffect(() => { const timer = window.setTimeout(() => setPage("overview"), 0); return () => window.clearTimeout(timer); }, [role]);

  const navItems: Record<Exclude<Role, "customer">, { id: OperatorPage; label: string; icon: LucideIcon }[]> = {
    technician: [
      { id: "overview", label: "Dashboard", icon: LayoutDashboard },
      { id: "requests", label: "Nearby requests", icon: Bell },
      { id: "jobs", label: "My jobs", icon: BriefcaseBusiness },
      { id: "earnings", label: "Earnings", icon: CircleDollarSign },
    ],
    business: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "dispatch", label: "Live dispatch", icon: Navigation },
      { id: "team", label: "Employees", icon: UsersRound },
      { id: "jobs", label: "Company jobs", icon: BriefcaseBusiness },
      { id: "payments", label: "Payments", icon: CircleDollarSign },
    ],
    admin: [
      { id: "overview", label: "Platform overview", icon: LayoutDashboard },
      { id: "providers", label: "Providers", icon: Store },
      { id: "categories", label: "Service categories", icon: Grid2X2 },
      { id: "payments", label: "Payments & fees", icon: CircleDollarSign },
      { id: "settings", label: "Platform settings", icon: Settings },
    ],
  };

  const roleTitle = role === "technician" ? "Pynaro Pro" : role === "business" ? "Pynaro Business" : "Pynaro Operations";

  return (
    <SidebarProvider className={`operator-shell role-${role}`}>
      {role !== "technician" && <Sidebar collapsible="offcanvas" className="operator-sidebar">
        <SidebarHeader><Logo /></SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems[role].map(({ id, label, icon: Icon }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton isActive={page === id} onClick={() => setPage(id)}>
                      <Icon /><span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem><SidebarMenuButton onClick={() => toast.info("Support center opened")}><LifeBuoy /><span>Help & support</span></SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton onClick={() => role === "admin" ? setPage("settings") : toast.info("Account settings opened")}><Settings /><span>Settings</span></SidebarMenuButton></SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>}
      <SidebarInset className="operator-inset">
        <header className="operator-header">
          <div>{role === "technician" ? <button className="operator-menu-button" type="button" aria-label="Open technician menu" onClick={() => setTechnicianMenuOpen(true)}><Menu size={19} /></button> : <SidebarTrigger><Menu size={19} /></SidebarTrigger>}<span><small>{roleTitle}</small><strong>{role === "admin" ? "Admin control center" : role === "business" ? state.businesses.find((item) => item.id === businessId)?.name : state.technicians.find((item) => item.id === techId)?.name}</strong></span></div>
          <div className="operator-header-actions">
            {role === "technician" && <Select value={techId} onValueChange={setTechId}><SelectTrigger className="operator-entity-select"><SelectValue /></SelectTrigger><SelectContent>{state.technicians.map((tech) => <SelectItem key={tech.id} value={tech.id}>{tech.name} · {state.businesses.find((item) => item.id === tech.businessId)?.name}</SelectItem>)}</SelectContent></Select>}
            {role === "business" && <Select value={businessId} onValueChange={setBusinessId}><SelectTrigger className="operator-entity-select"><SelectValue /></SelectTrigger><SelectContent>{state.businesses.map((business) => <SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>)}</SelectContent></Select>}
            <RolePicker role={role} onChange={onRoleChange} />
            <button className="header-icon" aria-label="Notifications" onClick={() => toast.info("No new notifications")}><Bell size={19} /><i /></button>
          </div>
        </header>
        <div className="operator-content">
          {role === "technician" && <TechnicianSurface page={page} state={state} techId={techId} refresh={refresh} onOpenJob={onOpenJob} />}
          {role === "business" && <BusinessSurface page={page} state={state} businessId={businessId} refresh={refresh} onOpenJob={onOpenJob} />}
          {role === "admin" && <AdminSurface page={page} state={state} refresh={refresh} />}
        </div>
        {role === "technician" && (
          <nav className="pro-bottom-nav" aria-label="Professional navigation">
            {navItems.technician.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}><Icon size={19} /><span>{label === "Nearby requests" ? "Requests" : label}</span></button>)}
          </nav>
        )}
      </SidebarInset>
      {role === "technician" && (
        <Sheet open={technicianMenuOpen} onOpenChange={setTechnicianMenuOpen}>
          <SheetContent side="left" className="customer-menu technician-menu">
            <SheetHeader><Logo /><SheetTitle>Technician menu</SheetTitle><SheetDescription>Open your work tools or switch to another Pynaro view.</SheetDescription></SheetHeader>
            <div className="customer-menu-links">
              {navItems.technician.map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? "active" : ""} onClick={() => { setPage(id); setTechnicianMenuOpen(false); }}><Icon size={19} />{label}<ChevronRight size={16} /></button>)}
            </div>
            <div className="customer-menu-role">
              <RolePicker role={role} onChange={(next) => { setTechnicianMenuOpen(false); onRoleChange(next); }} />
              <p>Choose Customer app to return to the homeowner view.</p>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </SidebarProvider>
  );
}

function OperatorTitle({ eyebrow, title, body, action }: { eyebrow: string; title: string; body?: string; action?: React.ReactNode }) {
  return <div className="operator-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{body && <p>{body}</p>}</div>{action}</div>;
}

function MetricCard({ icon: Icon, label, value, note, tone = "green" }: { icon: LucideIcon; label: string; value: string; note?: string; tone?: string }) {
  return <Card className="metric"><CardContent><span className={`metric-icon tone-${tone}`}><Icon size={19} /></span><div><small>{label}</small><strong>{value}</strong>{note && <em>{note}</em>}</div></CardContent></Card>;
}

async function runAction(body: Record<string, unknown>, message: string, refresh: () => Promise<void>) {
  try { await postAction(body); toast.success(message); await refresh(); }
  catch (error) { toast.error(error instanceof Error ? error.message : "Could not update Pynaro"); }
}

function ResponseCountdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");
  return <><strong className="timer">{minutes}:{secs}</strong><span>{remaining ? "maximum response window" : "Response window ended — choose another pro"}</span></>;
}

function TechnicianSurface({ page, state, techId, refresh, onOpenJob }: { page: OperatorPage; state: MarketplaceState; techId: string; refresh: () => Promise<void>; onOpenJob: (job: Job) => void }) {
  const tech = state.technicians.find((item) => item.id === techId) ?? state.technicians[0];
  const business = state.businesses.find((item) => item.id === tech.businessId)!;
  const openRequests = state.jobs.filter((job) => job.status === "requested" && job.requestedBusinessId === business.id && tech.tradeIds.includes(job.categoryId));
  const myJobs = state.jobs.filter((job) => job.technicianId === tech.id);
  const active = myJobs.filter((job) => !["paid", "cancelled"].includes(job.status));
  const completed = myJobs.filter((job) => job.status === "paid");
  const [estimateJob, setEstimateJob] = useState<Job | null>(null);
  const [availableNow, setAvailableNow] = useState(tech.status !== "offline");

  if (page === "requests") return <OperatorRequests state={state} requests={openRequests} tech={tech} business={business} refresh={refresh} onOpenJob={onOpenJob} />;
  if (page === "jobs") return <JobsPanel title="My assigned jobs" eyebrow="Technician operations" state={state} jobs={myJobs} onOpenJob={onOpenJob} actionFor={(job) => <TechAction job={job} refresh={refresh} onEstimate={() => setEstimateJob(job)} />} />;
  if (page === "earnings") return <EarningsPanel state={state} jobs={completed} />;

  const current = active[0];
  return <>
    <OperatorTitle eyebrow={`Today · ${new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}`} title={`Ready to help, ${tech.name.split(" ")[0]}?`} body="Your live status makes you visible to nearby customers." action={<label className="pro-availability"><span><i />{availableNow ? "Available" : "Offline"}</span><Switch checked={availableNow} onCheckedChange={(checked) => { setAvailableNow(checked); toast.success(checked ? "You are visible to nearby customers" : "You are now offline"); }} /></label>} />
    <div className="metric-grid"><MetricCard icon={Bell} label="New requests" value={String(openRequests.length)} note="Matched to your skills" tone="orange" /><MetricCard icon={Activity} label="Active jobs" value={String(active.length)} /><MetricCard icon={CheckCircle2} label="Completed jobs" value={String(tech.jobsCompleted)} note={`★ ${tech.rating} rating`} tone="blue" /><MetricCard icon={Banknote} label="Paid jobs" value={String(completed.length)} tone="purple" /></div>
    {current && <Card className="operator-card current-job-card"><CardContent><div className="card-heading"><div><span className="eyebrow">Current assignment</span><h2>{current.displayId} · {state.categories.find((item) => item.id === current.categoryId)?.name}</h2></div><Badge variant="secondary">{statusLabels[current.status]}</Badge></div><div className="current-job-body"><LiveMap technicians={[tech]} businesses={state.businesses} activeTechId={tech.id} compact useDeviceLocation={false} /><div><h3>{current.customerName}</h3><p><MapPin size={15} />{current.address}</p><p><Wrench size={15} />{current.problem}</p><div><Button onClick={() => onOpenJob(current)}>View job</Button><TechAction job={current} refresh={refresh} onEstimate={() => setEstimateJob(current)} /></div></div></div></CardContent></Card>}
    <div className="two-column"><Card className="operator-card"><CardContent><div className="card-heading"><div><span className="eyebrow">Nearby</span><h2>Open requests</h2></div><Badge>{openRequests.length} new</Badge></div>{openRequests.length ? openRequests.slice(0, 3).map((job) => <RequestOpsRow key={job.id} job={job} state={state} actions={<Button size="sm" onClick={() => runAction({ action: "update_job", jobId: job.id, status: "accepted", businessId: business.id, technicianId: tech.id, eventLabel: `Accepted by ${business.name}`, eventDetail: `${tech.name} assigned` }, `${job.displayId} accepted`, refresh)}>Accept</Button>} />) : <CompactEmpty icon={Bell} title="No nearby requests" />}</CardContent></Card><Card className="operator-card performance-card"><CardContent><div className="card-heading"><div><span className="eyebrow">Performance</span><h2>This week</h2></div></div><div className="performance-circle"><strong>96%</strong><span>response rate</span></div><dl><div><dt>Average response</dt><dd>43 sec</dd></div><div><dt>Arrival on time</dt><dd>92%</dd></div><div><dt>Customer rating</dt><dd>★ {tech.rating}</dd></div></dl></CardContent></Card></div>
    <EstimateDialog job={estimateJob} open={Boolean(estimateJob)} onOpenChange={(open) => !open && setEstimateJob(null)} refresh={refresh} />
  </>;
}

function OperatorRequests({ state, requests, tech, business, refresh, onOpenJob }: { state: MarketplaceState; requests: Job[]; tech: Technician; business: Business; refresh: () => Promise<void>; onOpenJob: (job: Job) => void }) {
  return <><OperatorTitle eyebrow="Matched to your skills and service radius" title="Nearby requests" body="Accepting assigns the request to you and shares precise locations with both sides." /><Card className="operator-card"><CardContent>{requests.length ? requests.map((job) => <RequestOpsRow key={job.id} job={job} state={state} actions={<><Button variant="outline" size="sm" onClick={() => onOpenJob(job)}>Details</Button><Button size="sm" onClick={() => runAction({ action: "update_job", jobId: job.id, status: "accepted", businessId: business.id, technicianId: tech.id, eventLabel: `Accepted by ${business.name}`, eventDetail: `${tech.name} assigned` }, `${job.displayId} accepted`, refresh)}>Accept</Button></>} />) : <CompactEmpty icon={LocateFixed} title="You’re all caught up" body="Keep your status available to receive new matching jobs." />}</CardContent></Card></>;
}

function RequestOpsRow({ job, state, actions }: { job: Job; state: MarketplaceState; actions: React.ReactNode }) {
  const category = state.categories.find((item) => item.id === job.categoryId)!;
  return <div className="ops-request-row"><CategoryIcon category={category} /><div><span><Badge variant={job.urgency === "emergency" ? "destructive" : "secondary"}>{job.urgency}</Badge><small>{shortDate(job.createdAt)}</small></span><strong>{category.name} · {job.problem}</strong><em><MapPin size={13} />Approx. {job.address.split(",").slice(-2).join(",")} · nearby</em></div><aside>{actions}</aside></div>;
}

function TechAction({ job, refresh, onEstimate }: { job: Job; refresh: () => Promise<void>; onEstimate: () => void }) {
  const config: Record<string, { label: string; next: string; event: string }> = {
    accepted: { label: "Start driving", next: "en_route", event: "Professional is on the way" },
    en_route: { label: "Mark arrived", next: "arrived", event: "Professional arrived" },
    approved: { label: "Start work", next: "in_progress", event: "Work started" },
    in_progress: { label: "Complete job", next: "completed", event: "Work completed" },
  };
  if (job.status === "arrived") return <Button size="sm" onClick={onEstimate}>Create estimate</Button>;
  const action = config[job.status];
  if (!action) return <Badge variant="outline">{statusLabels[job.status]}</Badge>;
  return <Button size="sm" variant="outline" onClick={() => runAction({ action: "update_job", jobId: job.id, status: action.next, eventLabel: action.event }, action.event, refresh)}>{action.label}</Button>;
}

function EstimateDialog({ job, open, onOpenChange, refresh }: { job: Job | null; open: boolean; onOpenChange: (open: boolean) => void; refresh: () => Promise<void> }) {
  const [description, setDescription] = useState("Diagnosis and professional repair");
  const [price, setPrice] = useState("325");
  if (!job) return null;
  const submit = async () => { await runAction({ action: "submit_estimate", jobId: job.id, items: [{ description, quantity: 1, unitPrice: Number(price) }] }, "Estimate sent to customer", refresh); onOpenChange(false); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Create written estimate</DialogTitle><DialogDescription>The customer must approve this amount before work begins.</DialogDescription></DialogHeader><label className="field-label"><span>Work description</span><Textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label><label className="field-label"><span>Repair price</span><Input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} /></label><DialogFooter><Button onClick={submit}>Send estimate</Button></DialogFooter></DialogContent></Dialog>;
}

function BusinessSurface({ page, state, businessId, refresh, onOpenJob }: { page: OperatorPage; state: MarketplaceState; businessId: string; refresh: () => Promise<void>; onOpenJob: (job: Job) => void }) {
  const business = state.businesses.find((item) => item.id === businessId) ?? state.businesses[0];
  const team = state.technicians.filter((item) => item.businessId === business.id);
  const jobs = state.jobs.filter((job) => job.requestedBusinessId === business.id || job.businessId === business.id);
  const incoming = jobs.filter((job) => job.status === "requested");
  const active = jobs.filter((job) => !["requested", "paid", "cancelled"].includes(job.status));
  const paid = jobs.filter((job) => job.status === "paid");
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  if (page === "team") return <TeamPanel state={state} business={business} team={team} />;
  if (page === "jobs") return <JobsPanel title="Company jobs" eyebrow="Service operations" state={state} jobs={jobs} onOpenJob={onOpenJob} />;
  if (page === "payments") return <EarningsPanel state={state} jobs={paid} />;
  if (page === "dispatch") return <DispatchPanel state={state} business={business} team={team} incoming={incoming} active={active} assignments={assignments} setAssignments={setAssignments} refresh={refresh} onOpenJob={onOpenJob} />;

  const net = paid.reduce((sum, job) => sum + job.estimateTotal + job.serviceCallFee + job.tip - job.pynaroFee, 0);
  return <>
    <OperatorTitle eyebrow="Company command center" title="Good afternoon" body="Track requests, employees, and customer jobs in real time." action={<Button onClick={() => { const name = window.prompt("Employee name"); if (name?.trim()) toast.success(`${name.trim()} invited to ${business.name}`); }}><Plus size={16} />Add employee</Button>} />
    <div className="metric-grid"><MetricCard icon={Bell} label="Incoming requests" value={String(incoming.length)} note="Respond within timer" tone="orange" /><MetricCard icon={Activity} label="Active jobs" value={String(active.length)} /><MetricCard icon={UsersRound} label="Available employees" value={`${team.filter((item) => item.status === "available").length}/${team.length}`} tone="blue" /><MetricCard icon={TrendingUp} label="Net revenue" value={money(net)} note="After Pynaro fees" tone="purple" /></div>
    <div className="two-column wide-left"><Card className="operator-card team-map-card"><CardContent><div className="card-heading"><div><span className="eyebrow">Live team</span><h2>Employee map</h2></div><Badge><i />Live</Badge></div><TeamMap team={team} businesses={state.businesses} /><div className="map-team-list">{team.map((tech) => <div key={tech.id}><PersonAvatar name={tech.name} color={business.color} /><span><strong>{tech.name}</strong><small>{tech.status.replace("_", " ")} · {tech.eta} min radius</small></span></div>)}</div></CardContent></Card><Card className="operator-card"><CardContent><div className="card-heading"><div><span className="eyebrow">Needs action</span><h2>Incoming requests</h2></div><Badge variant="destructive">{incoming.length} new</Badge></div>{incoming.length ? incoming.map((job) => <DispatchRequestRow key={job.id} job={job} state={state} team={team} business={business} selected={assignments[job.id] ?? team.find((tech) => tech.tradeIds.includes(job.categoryId))?.id ?? ""} onSelected={(value) => setAssignments({ ...assignments, [job.id]: value })} refresh={refresh} />) : <CompactEmpty icon={Bell} title="No waiting requests" />}</CardContent></Card></div>
    <JobsPanel title="Active jobs" eyebrow="In the field" state={state} jobs={active} onOpenJob={onOpenJob} compact />
  </>;
}

function TeamMap({ team, businesses }: { team: Technician[]; businesses: Business[] }) {
  return <div className="team-map"><LiveMap technicians={team} businesses={businesses} compact useDeviceLocation={false} /></div>;
}

function DispatchRequestRow({ job, state, team, business, selected, onSelected, refresh }: { job: Job; state: MarketplaceState; team: Technician[]; business: Business; selected: string; onSelected: (value: string) => void; refresh: () => Promise<void> }) {
  const category = state.categories.find((item) => item.id === job.categoryId)!;
  const matching = team.filter((tech) => tech.tradeIds.includes(job.categoryId));
  const chosen = matching.find((tech) => tech.id === selected);
  return <div className="dispatch-request"><div><CategoryIcon category={category} /><span><strong>{category.name} · {job.displayId}</strong><small>{job.problem}</small></span><Badge variant={job.urgency === "emergency" ? "destructive" : "secondary"}>{job.urgency}</Badge></div><label><span>Assign closest qualified employee</span><Select value={selected} onValueChange={onSelected}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{matching.map((tech) => <SelectItem key={tech.id} value={tech.id}>{tech.name} · {tech.eta} min · {tech.status.replace("_", " ")}</SelectItem>)}</SelectContent></Select></label><Button disabled={!chosen} onClick={() => chosen && runAction({ action: "update_job", jobId: job.id, status: "accepted", businessId: business.id, technicianId: chosen.id, eventLabel: `Accepted by ${business.name}`, eventDetail: `${chosen.name} assigned · ${chosen.eta} min ETA` }, `${job.displayId} assigned to ${chosen.name}`, refresh)}>Accept & assign</Button></div>;
}

function DispatchPanel({ state, business, team, incoming, active, assignments, setAssignments, refresh, onOpenJob }: { state: MarketplaceState; business: Business; team: Technician[]; incoming: Job[]; active: Job[]; assignments: Record<string, string>; setAssignments: (value: Record<string, string>) => void; refresh: () => Promise<void>; onOpenJob: (job: Job) => void }) {
  return <><OperatorTitle eyebrow="Real-time operations" title="Live dispatch" body="Assign the closest qualified employee—not the person closest to the office." /><div className="dispatch-grid"><Card className="operator-card"><CardContent><TeamMap team={team} businesses={state.businesses} /><div className="dispatch-team-list">{team.map((tech) => <div key={tech.id}><PersonAvatar name={tech.name} color={business.color} /><span><strong>{tech.name}</strong><small>{tech.skills.slice(0,2).join(" · ")}</small></span><Badge variant="secondary">{tech.status.replace("_", " ")}</Badge></div>)}</div></CardContent></Card><div><Card className="operator-card"><CardContent><div className="card-heading"><h2>Incoming</h2><Badge variant="destructive">{incoming.length}</Badge></div>{incoming.map((job) => <DispatchRequestRow key={job.id} job={job} state={state} team={team} business={business} selected={assignments[job.id] ?? team.find((tech) => tech.tradeIds.includes(job.categoryId))?.id ?? ""} onSelected={(value) => setAssignments({ ...assignments, [job.id]: value })} refresh={refresh} />)}{incoming.length === 0 && <CompactEmpty icon={Bell} title="Queue is clear" />}</CardContent></Card><Card className="operator-card active-field-card"><CardContent><div className="card-heading"><h2>Active in field</h2><Badge variant="secondary">{active.length}</Badge></div>{active.map((job) => <button key={job.id} onClick={() => onOpenJob(job)}><span><strong>{job.displayId} · {state.categories.find((item) => item.id === job.categoryId)?.name}</strong><small>{state.technicians.find((item) => item.id === job.technicianId)?.name}</small></span><Badge variant="secondary">{statusLabels[job.status]}</Badge><ChevronRight size={16} /></button>)}</CardContent></Card></div></div></>;
}

function TeamPanel({ state, business, team }: { state: MarketplaceState; business: Business; team: Technician[] }) {
  return <><OperatorTitle eyebrow="Roles, skills, and availability" title="Employees" body="Owners control the company, dispatchers manage jobs, and technicians see only their assignments." action={<Button onClick={() => { const name = window.prompt("Employee name"); if (name?.trim()) toast.success(`${name.trim()} invited to ${business.name}`); }}><Plus size={16} />Invite employee</Button>} /><Card className="operator-card table-card"><CardContent><div className="team-summary"><div><UsersRound size={21} /><span><strong>{team.length} employees</strong><small>{team.filter((tech) => tech.status === "available").length} available now</small></span></div><div><ShieldCheck size={21} /><span><strong>Documents current</strong><small>{team.length}/{team.length} verified</small></span></div></div><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Skills</TableHead><TableHead>Status</TableHead><TableHead>Rating</TableHead><TableHead>Documents</TableHead></TableRow></TableHeader><TableBody>{team.map((tech, index) => <TableRow key={tech.id}><TableCell><div className="person-cell"><PersonAvatar name={tech.name} color={business.color} /><span><strong>{tech.name}</strong><small>{index === 0 ? "Owner / Technician" : "Technician"}</small></span></div></TableCell><TableCell>{tech.tradeIds.map((id) => state.categories.find((item) => item.id === id)?.name).join(", ")}</TableCell><TableCell><Badge variant="secondary">{tech.status.replace("_", " ")}</Badge></TableCell><TableCell><Star size={13} fill="currentColor" /> {tech.rating}</TableCell><TableCell><Badge>Verified</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></>;
}

function JobsPanel({ title, eyebrow, state, jobs, onOpenJob, actionFor, compact = false }: { title: string; eyebrow: string; state: MarketplaceState; jobs: Job[]; onOpenJob: (job: Job) => void; actionFor?: (job: Job) => React.ReactNode; compact?: boolean }) {
  return <div className={compact ? "compact-jobs" : ""}>{!compact && <OperatorTitle eyebrow={eyebrow} title={title} />}<Card className="operator-card table-card"><CardContent>{compact && <div className="card-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div></div>}<Table><TableHeader><TableRow><TableHead>Job</TableHead><TableHead>Customer</TableHead><TableHead>Professional</TableHead><TableHead>Status</TableHead><TableHead>Total</TableHead><TableHead /></TableRow></TableHeader><TableBody>{jobs.map((job) => <TableRow key={job.id}><TableCell><strong>{job.displayId}</strong><small>{state.categories.find((item) => item.id === job.categoryId)?.name}</small></TableCell><TableCell><strong>{job.customerName}</strong><small>{job.address}</small></TableCell><TableCell>{state.technicians.find((item) => item.id === job.technicianId)?.name ?? "Unassigned"}</TableCell><TableCell><Badge variant="secondary">{statusLabels[job.status]}</Badge></TableCell><TableCell>{job.estimateTotal ? money(job.estimateTotal + job.serviceCallFee + job.tip) : "—"}</TableCell><TableCell><div className="table-actions">{actionFor?.(job)}<Button size="icon" variant="ghost" onClick={() => onOpenJob(job)}><ChevronRight size={16} /></Button></div></TableCell></TableRow>)}</TableBody></Table>{jobs.length === 0 && <CompactEmpty icon={BriefcaseBusiness} title="No jobs here yet" />}</CardContent></Card></div>;
}

function EarningsPanel({ state, jobs }: { state: MarketplaceState; jobs: Job[] }) {
  const gross = jobs.reduce((sum, job) => sum + job.estimateTotal + job.serviceCallFee + job.tip, 0);
  const fees = jobs.reduce((sum, job) => sum + job.pynaroFee, 0);
  return <><OperatorTitle eyebrow="Payments and payouts" title="Earnings" body="Completed-job fees are deducted automatically before payout." action={<Button variant="outline" onClick={() => downloadJobsReport(jobs, state)}><ReceiptText size={16} />Download report</Button>} /><div className="metric-grid"><MetricCard icon={CircleDollarSign} label="Gross payments" value={money(gross)} /><MetricCard icon={ReceiptText} label="Pynaro job fees" value={money(fees)} tone="orange" /><MetricCard icon={Banknote} label="Net payout" value={money(gross - fees)} tone="purple" /><MetricCard icon={CheckCircle2} label="Paid jobs" value={String(jobs.length)} tone="blue" /></div><JobsPanel title="Payout activity" eyebrow="Payment history" state={state} jobs={jobs} onOpenJob={() => undefined} compact /></>;
}

function CompactEmpty({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body?: string }) {
  return <div className="compact-empty"><span><Icon size={20} /></span><strong>{title}</strong>{body && <small>{body}</small>}</div>;
}

function AdminSurface({ page, state, refresh }: { page: OperatorPage; state: MarketplaceState; refresh: () => Promise<void> }) {
  if (page === "providers") return <ProviderPanel state={state} />;
  if (page === "categories") return <CategoriesPanel state={state} />;
  if (page === "payments") return <PaymentAdmin state={state} refresh={refresh} />;
  if (page === "settings") return <PlatformSettings state={state} refresh={refresh} />;
  const gross = state.jobs.filter((job) => job.status === "paid").reduce((sum, job) => sum + job.estimateTotal + job.serviceCallFee + job.tip, 0);
  const active = state.jobs.filter((job) => !["paid", "cancelled"].includes(job.status));
  return <><OperatorTitle eyebrow="Marketplace health" title="Platform overview" body="Monitor customers, professionals, money flow, and trust operations." /><div className="metric-grid"><MetricCard icon={BriefcaseBusiness} label="Total jobs" value={String(state.jobs.length)} note={`${active.length} active now`} /><MetricCard icon={BadgeCheck} label="Verified businesses" value={String(state.businesses.length)} tone="blue" /><MetricCard icon={TrendingUp} label="Gross marketplace volume" value={money(gross)} tone="purple" /><MetricCard icon={Headphones} label="Open support cases" value="0" tone="orange" /></div><div className="two-column"><Card className="operator-card"><CardContent><div className="card-heading"><div><span className="eyebrow">Job funnel</span><h2>Live marketplace</h2></div></div><div className="funnel-list">{["requested", "accepted", "en_route", "estimate_sent", "in_progress", "paid"].map((status) => { const count = state.jobs.filter((job) => job.status === status).length; return <div key={status}><span>{statusLabels[status]}</span><i><em style={{ width: `${Math.max(5, count * 18)}%` }} /></i><strong>{count}</strong></div>; })}</div></CardContent></Card><Card className="operator-card"><CardContent><div className="card-heading"><div><span className="eyebrow">Coverage</span><h2>Service categories</h2></div><Badge>{state.categories.length} live</Badge></div><div className="coverage-grid">{state.categories.map((category) => <div key={category.id}><CategoryIcon category={category} size={16} /><span><strong>{category.name}</strong><small>{state.technicians.filter((tech) => tech.tradeIds.includes(category.id)).length} pros</small></span></div>)}</div></CardContent></Card></div><JobsPanel title="Recent jobs" eyebrow="Latest marketplace activity" state={state} jobs={state.jobs.slice(0, 8)} onOpenJob={() => undefined} compact /></>;
}

function ProviderPanel({ state }: { state: MarketplaceState }) {
  return <><OperatorTitle eyebrow="Trust and safety" title="Provider verification" body="Approve businesses, monitor documents, and protect marketplace quality." action={<Button onClick={() => { const name = window.prompt("Business name"); if (name?.trim()) toast.success(`${name.trim()} added to the verification queue`); }}><Plus size={16} />Invite business</Button>} /><div className="metric-grid"><MetricCard icon={BadgeCheck} label="Verified businesses" value={String(state.businesses.length)} /><MetricCard icon={UsersRound} label="Active professionals" value={String(state.technicians.filter((tech) => tech.status !== "offline").length)} tone="blue" /><MetricCard icon={ReceiptText} label="Documents expiring" value="0" tone="orange" /><MetricCard icon={Star} label="Average rating" value={(state.businesses.reduce((sum, item) => sum + item.rating, 0) / state.businesses.length).toFixed(1)} tone="purple" /></div><Card className="operator-card table-card"><CardContent><Table><TableHeader><TableRow><TableHead>Business</TableHead><TableHead>Services</TableHead><TableHead>Professionals</TableHead><TableHead>License</TableHead><TableHead>Insurance</TableHead></TableRow></TableHeader><TableBody>{state.businesses.map((business) => <TableRow key={business.id}><TableCell><div className="person-cell"><PersonAvatar name={business.name} color={business.color} /><span><strong>{business.name}</strong><small>{business.reviews} reviews</small></span></div></TableCell><TableCell>{business.tradeIds.map((id) => state.categories.find((item) => item.id === id)?.name).join(", ")}</TableCell><TableCell>{state.technicians.filter((tech) => tech.businessId === business.id).length}</TableCell><TableCell><Badge>Verified</Badge></TableCell><TableCell><Badge>Current</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></>;
}

function CategoriesPanel({ state }: { state: MarketplaceState }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(state.categories.map((category) => [category.id, true])));
  return <><OperatorTitle eyebrow="Marketplace configuration" title="Service categories" body="Every category uses the same request, matching, dispatch, estimate, payment, and review engine." action={<Button onClick={() => { const name = window.prompt("New service category"); if (name?.trim()) toast.success(`${name.trim()} category created`); }}><Plus size={16} />Add category</Button>} /><div className="admin-category-grid">{state.categories.map((category) => <Card key={category.id} className={!enabled[category.id] ? "disabled" : ""}><CardContent><CategoryIcon category={category} /><div><strong>{category.name}</strong><span>{category.description}</span><small>{state.businesses.filter((business) => business.tradeIds.includes(category.id)).length} businesses · {state.technicians.filter((tech) => tech.tradeIds.includes(category.id)).length} professionals</small></div><Switch checked={enabled[category.id]} onCheckedChange={(checked) => setEnabled({ ...enabled, [category.id]: checked })} aria-label={`Enable ${category.name}`} /></CardContent></Card>)}</div></>;
}

function PaymentAdmin({ state, refresh }: { state: MarketplaceState; refresh: () => Promise<void> }) {
  const paid = state.jobs.filter((job) => job.status === "paid");
  const gross = paid.reduce((sum, job) => sum + job.estimateTotal + job.serviceCallFee + job.tip, 0);
  const fees = paid.reduce((sum, job) => sum + job.pynaroFee, 0);
  const [fee, setFee] = useState(String(state.settings.feePercent));
  return <><OperatorTitle eyebrow="Money flow" title="Payments and fees" body="Customers pay through Pynaro. Contractors pay only for completed, paid jobs." /><div className="metric-grid"><MetricCard icon={CreditCard} label="Customer payments" value={money(gross)} /><MetricCard icon={CircleDollarSign} label="Platform fees" value={money(fees)} tone="purple" /><MetricCard icon={Banknote} label="Provider payouts" value={money(gross - fees)} tone="blue" /><MetricCard icon={CheckCircle2} label="Paid jobs" value={String(paid.length)} tone="orange" /></div><div className="two-column"><Card className="operator-card settings-card"><CardContent><div className="card-heading"><div><span className="eyebrow">Configurable</span><h2>Completed-job fee</h2></div><Badge>Live</Badge></div><label className="field-label"><span>Percentage fee</span><Input type="number" min="0" max="50" value={fee} onChange={(event) => setFee(event.target.value)} /></label><Button onClick={() => runAction({ action: "update_settings", ...state.settings, feePercent: Number(fee) }, "Job fee saved", refresh)}>Save fee configuration</Button><p className="settings-note"><ShieldCheck size={17} />The value is adjustable and never hardcoded into checkout.</p></CardContent></Card><Card className="operator-card money-flow-card"><CardContent><div className="card-heading"><div><span className="eyebrow">Example</span><h2>How a $500 job moves</h2></div></div>{[{ n: 1, title: "Customer pays", note: "After job completion", value: 500 }, { n: 2, title: "Pynaro fee", note: `${fee}% completed-job fee`, value: -(500 * Number(fee) / 100) }, { n: 3, title: "Provider payout", note: "To connected business account", value: 500 - 500 * Number(fee) / 100 }].map((step) => <div className="money-step" key={step.n}><span>{step.n}</span><div><strong>{step.title}</strong><small>{step.note}</small></div><b>{money(step.value)}</b></div>)}</CardContent></Card></div></>;
}

function PlatformSettings({ state, refresh }: { state: MarketplaceState; refresh: () => Promise<void> }) {
  const [settings, setSettings] = useState(state.settings);
  return <><OperatorTitle eyebrow="Global marketplace rules" title="Platform settings" body="Control response timers, privacy, and the no-lead-blasting rule." /><Card className="operator-card settings-card full-settings"><CardContent><section><div><h3>Response timers</h3><p>Emergency and normal jobs use different business-response windows.</p></div><div className="settings-inputs"><label className="field-label"><span>Emergency timer (seconds)</span><Input type="number" value={settings.emergencyResponseSeconds} onChange={(event) => setSettings({ ...settings, emergencyResponseSeconds: Number(event.target.value) })} /></label><label className="field-label"><span>Immediate timer (seconds)</span><Input type="number" value={settings.immediateResponseSeconds} onChange={(event) => setSettings({ ...settings, immediateResponseSeconds: Number(event.target.value) })} /></label></div></section><section><div><h3>Location privacy</h3><p>Hide exact locations until a professional accepts.</p></div><label className="setting-switch"><span><strong>Precise tracking after acceptance</strong><small>Before acceptance, both sides see approximate areas only.</small></span><Switch checked={settings.preciseLocationAfterAcceptance} onCheckedChange={(checked) => setSettings({ ...settings, preciseLocationAfterAcceptance: checked })} /></label></section><section><div><h3>Marketplace rule</h3><p>Each request goes to one customer-selected business.</p></div><div className="locked-rule"><LockKeyhole size={18} /><span><strong>No lead blasting</strong><small>Customer approval is required before choosing another provider.</small></span><Badge>Enforced</Badge></div></section><Button onClick={() => runAction({ action: "update_settings", ...settings }, "Platform settings saved", refresh)}>Save platform settings</Button></CardContent></Card></>;
}

function CustomerHome({ state, onRequest, onOpenMap, onOpenJob }: { state: MarketplaceState; onRequest: (categoryId?: string) => void; onOpenMap: () => void; onOpenJob: (job: Job) => void }) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const active = state.jobs.find((job) => !["paid", "cancelled"].includes(job.status));
  const filtered = state.categories.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  const categories = search || showAll ? filtered : filtered.slice(0, 8);
  const recent = state.jobs.find((job) => job.status === "paid");
  return (
    <>
      <section className="home-heading">
        <div><h1>Hi, Arman</h1><button className="home-address" onClick={onOpenMap}><MapPin size={15} />6203 Murietta Ave, Van Nuys</button></div>
      </section>

      <label className="service-search"><Search size={19} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="What service do you need?" /><Settings size={18} /></label>

      <section className="emergency-card">
        <span><AlertTriangle size={25} /></span><div className="emergency-copy"><h2>Emergency? Get help now</h2><p>Find the nearest available professional</p></div><button onClick={onRequest} aria-label="Find emergency help"><ChevronRight size={24} /></button>
      </section>

      <section className="content-section services-home">
        <div className="section-title"><h2>{search ? "Matching services" : "Popular Services"}</h2></div>
        <div className="service-grid">
          {categories.map((category) => (
            <button className="service-card" key={category.id} onClick={() => onRequest(category.id)}>
              <CategoryIcon category={{ ...category, accent: "#075cf2" }} />
              <strong>{category.name}</strong>
            </button>
          ))}
        </div>
        {!search && filtered.length > 8 && <button className="more-services" onClick={() => setShowAll(!showAll)}>{showAll ? "Show popular services" : `View all ${filtered.length} services`}<ChevronDown size={15} /></button>}
      </section>

      {active && (
        <section className="content-section active-home-section">
          <div className="section-title"><h2>Your Active Service</h2><Button variant="ghost" onClick={() => onOpenJob(active)}>View<ChevronRight size={16} /></Button></div>
          <ActiveJob job={active} state={state} onOpen={() => onOpenJob(active)} />
        </section>
      )}

      {recent && <section className="content-section recent-service"><div className="section-title"><h2>Recent Service</h2></div><button onClick={() => onOpenJob(recent)}><PersonAvatar name="Andy" /><div><strong>Andy&apos;s Plumbing</strong><span>Plumbing · Completed</span></div><span className="receipt-link">View Receipt</span></button></section>}

      <section className="content-section recommended-home">
        <div className="section-title"><h2>Recommended Near You</h2></div>
        <button onClick={onRequest}><PersonAvatar name="Andy" /><div><span><strong>Andy&apos;s Plumbing</strong><BadgeCheck size={14} /></span><em>Plumbing · Available</em><small><Star size={13} fill="currentColor" /> 4.9 (128) &nbsp; · &nbsp; 0.6 mi &nbsp; · &nbsp; 8 min</small></div><ChevronRight size={18} /></button>
      </section>
    </>
  );
}

function ActiveJob({ job, state, onOpen }: { job: Job; state: MarketplaceState; onOpen: () => void }) {
  const category = state.categories.find((item) => item.id === job.categoryId)!;
  const business = state.businesses.find((item) => item.id === (job.businessId ?? job.requestedBusinessId));
  const tech = state.technicians.find((item) => item.id === job.technicianId);
  return (
    <button className="active-job" onClick={onOpen}>
      <MapSurface businesses={tech ? 1 : 3} />
      <div className="active-job-copy">
        <div className="active-job-title"><CategoryIcon category={category} size={18} /><div><small>{job.displayId} · {category.name}</small><h3>{statusLabels[job.status]}</h3></div><Badge>{job.urgency === "emergency" ? "Emergency" : "Active"}</Badge></div>
        <div className="active-provider"><PersonAvatar name={tech?.name ?? business?.name ?? "Nearby pro"} color={business?.color} /><div><strong>{tech?.name ?? business?.name ?? "Waiting for your selected business"}</strong><span>{business?.name}</span></div>{tech && <div className="eta"><strong>{tech.eta} min</strong><span>ETA</span></div>}</div>
        <Progress value={job.status === "requested" ? 10 : job.status === "accepted" ? 30 : job.status === "en_route" ? 50 : job.status === "estimate_sent" ? 70 : 90} />
      </div>
    </button>
  );
}

function Bookings({ state, onOpenJob, onRequest }: { state: MarketplaceState; onOpenJob: (job: Job) => void; onRequest: () => void }) {
  return (
    <section className="page-view">
      <div className="page-title"><div><span className="eyebrow">Your service history</span><h1>Bookings</h1></div><Button onClick={onRequest}>New request</Button></div>
      {state.jobs.length === 0 ? <EmptyState icon={CalendarDays} title="No bookings yet" body="Your active and completed services will appear here." /> : <div className="booking-list">{state.jobs.map((job) => {
        const category = state.categories.find((item) => item.id === job.categoryId)!;
        const business = state.businesses.find((item) => item.id === (job.businessId ?? job.requestedBusinessId));
        return <button key={job.id} onClick={() => onOpenJob(job)}><CategoryIcon category={category} /><div><small>{job.displayId} · {shortDate(job.createdAt)}</small><strong>{category.name}</strong><span>{business?.name}</span></div><Badge variant="secondary">{statusLabels[job.status]}</Badge><ChevronRight size={18} /></button>;
      })}</div>}
    </section>
  );
}

function Messages({ state }: { state: MarketplaceState; onOpenJob: (job: Job) => void }) {
  const messages = state.jobs.filter((job) => job.businessId);
  const [chat, setChat] = useState<string | null>(null);
  return <><section className="page-view"><div className="page-title"><div><span className="eyebrow">Stay connected</span><h1>Messages</h1></div></div>{messages.length === 0 ? <EmptyState icon={MessageCircle} title="No conversations" body="Messages with professionals stay connected to each job." /> : <div className="message-list">{messages.map((job) => { const business = state.businesses.find((item) => item.id === job.businessId)!; const tech = state.technicians.find((item) => item.id === job.technicianId); return <button key={job.id} onClick={() => setChat(tech?.name ?? business.name)}><PersonAvatar name={tech?.name ?? business.name} color={business.color} /><div><strong>{business.name}</strong><span>{tech?.name}: Update for {job.displayId}</span></div><small>{shortDate(job.createdAt)}</small></button>; })}</div>}</section><QuickMessageDialog open={Boolean(chat)} onOpenChange={(open) => !open && setChat(null)} recipient={chat ?? "your professional"} /></>;
}

function Account({ role, onRoleChange }: { role: Role; onRoleChange: (role: Role) => void }) {
  return <section className="page-view"><Card className="profile-card"><CardContent><PersonAvatar name="Arman Ghazaryan" color="#0b5df5" /><div><h1>Arman Ghazaryan</h1><p>(424) 888-5555 · arman@example.com</p></div><Button variant="outline" onClick={() => toast.success("Profile editing opened")}>Edit</Button></CardContent></Card><div className="account-groups">{[{ icon: UserRound, title: "Profile information", meta: "Arman G." }, { icon: MapPin, title: "Saved addresses", meta: "2" }, { icon: CreditCard, title: "Payment methods", meta: "Visa •••• 4242" }, { icon: ShieldCheck, title: "Safety & privacy", meta: "" }].map(({ icon: Icon, title, meta }) => <button key={title} onClick={() => toast.info(`${title} opened`)}><span><Icon size={18} /></span><div><strong>{title}</strong><small>{meta}</small></div><ChevronRight size={17} /></button>)}</div><div className="account-demo"><span>Preview every side of Pynaro</span><RolePicker role={role} onChange={onRoleChange} /></div></section>;
}

function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return <div className="empty-state"><span><Icon size={23} /></span><h3>{title}</h3><p>{body}</p></div>;
}

function RequestDialog({ open, onOpenChange, state, initialCategoryId, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; state: MarketplaceState; initialCategoryId: string; onCreated: (job: Job) => void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState("");
  const [uploads, setUploads] = useState<{ name: string; url: string; video: boolean }[]>([]);
  const [draft, setDraft] = useState<Draft>({ categoryId: initialCategoryId, problem: "", urgency: "now", address: "6203 Murietta Ave, Van Nuys, CA 91401", unit: "", accessNotes: "", scheduledFor: "", requestedBusinessId: "" });
  const category = state.categories.find((item) => item.id === draft.categoryId);
  const matches = useMemo(() => state.businesses.filter((business) => business.tradeIds.includes(draft.categoryId)).map((business) => ({ business, nearest: state.technicians.filter((tech) => tech.businessId === business.id && tech.tradeIds.includes(draft.categoryId) && tech.status !== "offline").sort((a, b) => a.eta - b.eta)[0] })).filter((item) => item.nearest).sort((a, b) => a.nearest.eta - b.nearest.eta), [draft.categoryId, state]);
  const matchingTechs = useMemo(() => state.technicians.filter((tech) => tech.tradeIds.includes(draft.categoryId) && tech.status !== "offline").sort((a, b) => a.eta - b.eta), [draft.categoryId, state.technicians]);
  const addUploads = (files: FileList | null) => {
    uploads.forEach((item) => URL.revokeObjectURL(item.url));
    setUploads(Array.from(files ?? []).slice(0, 5).map((file) => ({ name: file.name, url: URL.createObjectURL(file), video: file.type.startsWith("video/") })));
  };
  const canContinue = step === 0 ? Boolean(draft.categoryId) : step === 1 ? draft.problem.trim().length >= 8 && (draft.urgency !== "scheduled" || Boolean(draft.scheduledFor)) : step === 2 ? Boolean(draft.address) : Boolean(draft.requestedBusinessId);
  const create = async () => {
    setSaving(true);
    try {
      const response = await postAction<{ job: Job }>({ action: "create_job", ...draft });
      toast.success("Request sent to your selected business");
      onCreated(response.job);
      setStep(0);
      setSelectedTechId("");
      setUploads([]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not send request"); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="request-dialog" showCloseButton={false}>
        <DialogHeader className="request-dialog-header"><div><Button variant="ghost" size="icon" onClick={() => step === 0 ? onOpenChange(false) : setStep(step - 1)}><ArrowLeft size={19} /></Button><Logo /><Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}><X size={19} /></Button></div><Progress value={(step + 1) * 20} /></DialogHeader>
        <div className="request-dialog-body">
          {step === 0 && <div className="request-step"><span className="eyebrow">Step 1</span><DialogTitle>What do you need help with?</DialogTitle><DialogDescription>Select the service that best matches the problem.</DialogDescription><div className="request-category-grid">{state.categories.map((item) => <button key={item.id} className={draft.categoryId === item.id ? "selected" : ""} onClick={() => setDraft({ ...draft, categoryId: item.id, requestedBusinessId: "" })}><CategoryIcon category={item} /><strong>{item.name}</strong><small>{item.description}</small>{draft.categoryId === item.id && <CheckCircle2 size={18} />}</button>)}</div></div>}
          {step === 1 && category && <div className="request-step"><span className="eyebrow">Step 2 · {category.name}</span><DialogTitle>Tell us what&apos;s happening</DialogTitle><DialogDescription>This helps the professional arrive prepared.</DialogDescription><div className="urgency-grid">{([{ id: "emergency", title: "Emergency", body: "Safety, property, or access is at risk", icon: AlertTriangle }, { id: "now", title: "As soon as possible", body: "Needs attention today", icon: Clock3 }, { id: "scheduled", title: "Schedule it", body: "Choose a future time", icon: CalendarDays }] as const).map(({ id, title, body, icon: Icon }) => <button key={id} className={draft.urgency === id ? "selected" : ""} onClick={() => setDraft({ ...draft, urgency: id })}><Icon size={20} /><div><strong>{title}</strong><small>{body}</small></div>{draft.urgency === id && <Check size={17} />}</button>)}</div>{draft.urgency === "scheduled" && <label className="field-label"><span>Appointment date and time</span><Input type="datetime-local" value={draft.scheduledFor} onChange={(event) => setDraft({ ...draft, scheduledFor: event.target.value })} /></label>}{draft.urgency === "emergency" && <div className="safety-alert"><AlertTriangle size={18} /><span><strong>If anyone is in immediate danger, call 911.</strong><small>Pynaro will show safe shutoff guidance while help is coming.</small></span></div>}<label className="field-label"><span>Describe the problem</span><Textarea rows={5} value={draft.problem} onChange={(event) => setDraft({ ...draft, problem: event.target.value })} placeholder="Kitchen sink is leaking and the water will not stop." /></label>{uploads.length > 0 && <div className="upload-preview-grid">{uploads.map((item) => <div key={item.url}>{item.video ? <video src={item.url} controls /> : <img src={item.url} alt={item.name} />}<small>{item.name}</small></div>)}</div>}<label className="upload-field"><Camera size={21} /><strong>{uploads.length ? "Replace photos or video" : "Add photos or video"}</strong><small>Optional · choose your own files</small><Input type="file" multiple accept="image/*,video/*" onChange={(event) => addUploads(event.target.files)} /></label></div>}
          {step === 2 && <div className="request-step"><span className="eyebrow">Step 3</span><DialogTitle>Where should they go?</DialogTitle><DialogDescription>Your exact address stays private until the selected business accepts.</DialogDescription><LiveMap technicians={state.technicians} businesses={state.businesses} compact /><div className="field-row"><label className="field-label wide"><span>Service address</span><Input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label><label className="field-label"><span>Unit or suite</span><Input value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="Optional" /></label><label className="field-label"><span>Entry instructions</span><Input value={draft.accessNotes} onChange={(event) => setDraft({ ...draft, accessNotes: event.target.value })} placeholder="Gate code, parking, pets…" /></label></div><div className="privacy-note"><ShieldCheck size={18} /><span><strong>Location privacy built in</strong><small>Professionals see an approximate area before accepting.</small></span></div></div>}
          {step === 3 && category && <div className="request-step"><span className="eyebrow">Step 4 · Live availability</span><DialogTitle>Professionals near you</DialogTitle><DialogDescription>Tap a live marker or card to choose one professional. Your request is never sent to multiple companies.</DialogDescription><div className="provider-layout"><LiveMap technicians={matchingTechs} businesses={state.businesses} selectedTechId={selectedTechId} onSelectTech={(tech) => { setSelectedTechId(tech.id); setDraft({ ...draft, requestedBusinessId: tech.businessId }); }} /><div className="provider-list">{matches.map(({ business, nearest }, index) => <button key={business.id} className={draft.requestedBusinessId === business.id ? "selected" : ""} onClick={() => { setSelectedTechId(nearest.id); setDraft({ ...draft, requestedBusinessId: business.id }); }}><span className="provider-rank">{index + 1}</span><PersonAvatar name={nearest.name} color={business.color} /><div><div><strong>{business.name}</strong><BadgeCheck size={15} /></div><span><Star size={13} fill="currentColor" />{business.rating} ({business.reviews}) · {nearest.eta} min</span><small><ShieldCheck size={12} />{nearest.name} · {nearest.status.replace("_", " ")}</small></div><aside><strong>{money(business.serviceCallFee)}</strong><small>service call</small>{draft.requestedBusinessId === business.id && <CheckCircle2 size={20} />}</aside></button>)}</div></div></div>}
          {step === 4 && category && (() => { const business = state.businesses.find((item) => item.id === draft.requestedBusinessId)!; return <div className="request-step"><span className="eyebrow">Step 5</span><DialogTitle>Review and send your request</DialogTitle><DialogDescription>You approve the repair estimate later. Nothing is charged for repairs now.</DialogDescription><Card className="review-card"><CardContent><div className="review-business"><PersonAvatar name={business.name} color={business.color} /><div><small>Requesting</small><strong>{business.name}</strong><span><Star size={13} fill="currentColor" />{business.rating} · Verified and insured</span></div></div><dl><div><dt>Service</dt><dd>{category.name}</dd></div><div><dt>Timing</dt><dd>{draft.urgency === "now" ? "As soon as possible" : draft.urgency}</dd></div><div className="wide"><dt>Address</dt><dd>{draft.address}</dd></div><div className="wide"><dt>Problem</dt><dd>{draft.problem}</dd></div></dl></CardContent></Card><div className="authorization-card"><CreditCard size={22} /><span><small>Payment authorization</small><strong>Visa •••• 4242</strong><em>Verified now; charged only after approval and completion.</em></span></div><div className="checkout-row"><span>Service-call fee</span><strong>{money(business.serviceCallFee)}</strong></div><div className="checkout-row total"><span>Due now</span><strong>{money(0)}</strong></div></div>; })()}
        </div>
        <DialogFooter className="request-footer"><span>{step + 1} of 5</span>{step < 4 ? <Button disabled={!canContinue} onClick={() => setStep(step + 1)}>Continue<ArrowRight size={17} /></Button> : <Button disabled={saving} onClick={create}><LockKeyhole size={16} />{saving ? "Sending request…" : "Authorize card & request pro"}</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function JobDialog({ job, state, open, onOpenChange, onChanged }: { job: Job | null; state: MarketplaceState; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => Promise<void> }) {
  if (!job) return null;
  const category = state.categories.find((item) => item.id === job.categoryId)!;
  const business = state.businesses.find((item) => item.id === (job.businessId ?? job.requestedBusinessId));
  const tech = state.technicians.find((item) => item.id === job.technicianId);
  const update = async (body: Record<string, unknown>, message: string) => { try { await postAction({ action: "update_job", jobId: job.id, ...body }); toast.success(message); await onChanged(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update job"); } };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="job-dialog">
        <DialogHeader><div className="job-heading"><CategoryIcon category={category} /><div><small>{job.displayId} · {shortDate(job.createdAt)}</small><DialogTitle>{category.name} service</DialogTitle><DialogDescription>{job.address}</DialogDescription></div><Badge>{statusLabels[job.status]}</Badge></div></DialogHeader>
        <div className="job-dialog-grid"><div className="job-primary">
          {job.status === "requested" && <section className="waiting-status"><span className="pulse-marker"><Navigation size={23} /></span><small className="eyebrow">Request sent</small><h2>Waiting for {business?.name}</h2><p>They are reviewing your request. It has not been shared with another company.</p><ResponseCountdown seconds={job.urgency === "emergency" ? state.settings.emergencyResponseSeconds : state.settings.immediateResponseSeconds} /></section>}
          {["accepted", "en_route", "arrived"].includes(job.status) && <section className="tracking-status"><LiveMap technicians={tech ? [tech] : []} businesses={state.businesses} activeTechId={tech?.id} selectedTechId={tech?.id} /><div><PersonAvatar name={tech?.name ?? business?.name ?? "Pro"} color={business?.color} /><span><small>{business?.name}</small><h2>{job.status === "accepted" ? `${tech?.name ?? "Your pro"} accepted your request` : job.status === "arrived" ? `${tech?.name ?? "Your pro"} has arrived` : `${tech?.name ?? "Your pro"} is on the way`}</h2>{tech && <p><Star size={13} fill="currentColor" />{tech.rating} · {tech.eta} min ETA</p>}</span><Button size="icon" variant="outline" onClick={() => { window.location.href = "tel:+18185550147"; }}><Phone size={17} /></Button><Button size="icon" variant="outline" onClick={() => toast.success("Message thread opened")}><MessageCircle size={17} /></Button></div></section>}
          {job.status === "estimate_sent" && <section className="estimate-card"><div><span><small className="eyebrow">Written estimate</small><h2>Review before work begins</h2></span><Badge variant="secondary">Approval required</Badge></div>{job.estimateItems.map((item, index) => <div className="estimate-line" key={index}><span>{item.description}<small>{item.quantity} × {money(item.unitPrice)}</small></span><strong>{money(item.quantity * item.unitPrice)}</strong></div>)}<div className="estimate-line"><span>Service-call fee</span><strong>{money(job.serviceCallFee)}</strong></div><div className="estimate-total"><span>Estimated total</span><strong>{money(job.estimateTotal + job.serviceCallFee)}</strong></div><Button onClick={() => update({ status: "approved", eventLabel: "Estimate approved by customer", eventDetail: `${money(job.estimateTotal)} approved` }, "Estimate approved")}><CheckCircle2 size={17} />Approve estimate</Button></section>}
          {["approved", "in_progress"].includes(job.status) && <section className="waiting-status"><span className="work-marker"><Wrench size={24} /></span><small className="eyebrow">{business?.name}</small><h2>{job.status === "approved" ? "Estimate approved" : "Work is underway"}</h2><p>{tech?.name ?? "Your professional"} will update the job when the service is complete.</p></section>}
          {job.status === "completed" && <PaymentCard job={job} onPay={(tip) => update({ status: "paid", paymentStatus: "paid", tip, eventLabel: "Payment completed", eventDetail: `Charged to •••• ${job.cardLast4}` }, "Payment completed securely")} />}
          {job.status === "paid" && <ReceiptCard job={job} update={update} />}
          <Card className="request-summary"><CardContent><h3>Service request</h3><p>{job.problem}</p><dl><div><dt>Urgency</dt><dd>{job.urgency}</dd></div><div><dt>Payment</dt><dd>{job.paymentStatus}</dd></div></dl></CardContent></Card>
        </div><aside className="job-sidebar">{business && <Card><CardContent className="mini-business"><PersonAvatar name={business.name} color={business.color} /><span><small>Selected business</small><strong>{business.name}</strong><em><Star size={12} fill="currentColor" />{business.rating}</em></span></CardContent></Card>}<Card><CardContent className="timeline"><h3>Timeline</h3>{[...job.events].reverse().map((event, index) => <div className={index === 0 ? "current" : ""} key={event.id}><span><Check size={11} /></span><p><strong>{event.label}</strong>{event.detail && <small>{event.detail}</small>}<time>{shortDate(event.at)}</time></p></div>)}</CardContent></Card></aside></div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentCard({ job, onPay }: { job: Job; onPay: (tip: number) => void }) {
  const [tip, setTip] = useState(0);
  return <section className="estimate-card"><div><span><small className="eyebrow">Job complete</small><h2>Review and pay securely</h2></span><CheckCircle2 color="#169c50" /></div>{job.estimateItems.map((item, index) => <div className="estimate-line" key={index}><span>{item.description}</span><strong>{money(item.quantity * item.unitPrice)}</strong></div>)}<div className="estimate-line"><span>Service-call fee</span><strong>{money(job.serviceCallFee)}</strong></div><div className="tip-picker"><span>Add a tip for Andy</span><div>{[0, 15, 25, 40].map((amount) => <Button key={amount} variant={tip === amount ? "default" : "outline"} size="sm" onClick={() => setTip(amount)}>{amount === 0 ? "No tip" : money(amount)}</Button>)}</div></div><div className="estimate-total"><span>Total</span><strong>{money(job.estimateTotal + job.serviceCallFee + tip)}</strong></div><Button className="wide-button" onClick={() => onPay(tip)}><LockKeyhole size={16} />Pay with Visa •••• {job.cardLast4}</Button></section>;
}

function ReceiptCard({ job, update }: { job: Job; update: (body: Record<string, unknown>, message: string) => Promise<void> }) {
  const [rating, setRating] = useState(job.rating ?? 5);
  const [review, setReview] = useState(job.review ?? "");
  return <section className="estimate-card receipt"><div className="receipt-check"><span><Check size={23} /></span><h2>Payment complete</h2><p>Receipt sent to arman@example.com</p></div><div className="estimate-total"><span>Paid</span><strong>{money(job.estimateTotal + job.serviceCallFee + job.tip)}</strong></div>{!job.review ? <div className="review-box"><h3>How was your service?</h3><div>{[1, 2, 3, 4, 5].map((value) => <button key={value} onClick={() => setRating(value)}><Star size={23} fill={value <= rating ? "currentColor" : "none"} /></button>)}</div><Textarea value={review} onChange={(event) => setReview(event.target.value)} placeholder="Share your experience…" /><Button onClick={() => update({ rating, review, eventLabel: "Customer review submitted" }, "Thank you for your review")}>Submit review</Button></div> : <p className="saved-review">“{job.review}”</p>}</section>;
}
