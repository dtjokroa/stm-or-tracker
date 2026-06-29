// ── Types ──────────────────────────────────────────────────────────

export interface Principal {
  id: string;
  name: string;
  color: string;
}

export interface Unit {
  id: string;
  name: string;
  serial: string;
  label: string;
}

export type UnitsByPrincipal = Record<string, Unit[]>;

export type RentalStatus = "scheduled" | "in-or" | "completed" | "cancelled";

export const RENTAL_STATUSES: { value: RentalStatus; label: string; color: string }[] = [
  { value: "scheduled", label: "Scheduled", color: "#f59e0b" },
  { value: "in-or", label: "In OR", color: "#10b981" },
  { value: "completed", label: "Completed", color: "#6366f1" },
  { value: "cancelled", label: "Cancelled", color: "#ef4444" },
];

export function normalizeStatus(value?: string | null): RentalStatus {
  if (value === "in-or" || value === "completed" || value === "cancelled") return value;
  return "scheduled";
}

export type CompanionRole =
  | "Field Specialist"
  | "Product Specialist"
  | "Biomedical Engineer"
  | "Technician"
  | "Sales";

export const COMPANION_ROLES: CompanionRole[] = [
  "Field Specialist",
  "Product Specialist",
  "Biomedical Engineer",
  "Technician",
  "Sales",
];

export interface Companion {
  id: string;
  name: string;
  role: CompanionRole;
}

export interface Rental {
  id: string;
  principalId: string;
  unitId: string;
  unitLabel: string;
  serial: string;
  hospitalName: string;
  department: string;
  surgeonName: string;
  procedure: string;
  rentalStart: string;
  rentalEnd: string;
  status: RentalStatus;
  companionId: string;
  companionName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ── Constants ─────────────────────────────────────────────────────

export const PRINCIPALS: Principal[] = [
  { id: "principal", name: "Principal", color: "#2563eb" },
];

export const PRINCIPAL_ID = PRINCIPALS[0].id;

const mkUnit = (name: string, serial: string): Unit => ({
  id: serial,
  name,
  serial,
  label: `${name} (${serial})`,
});

export const DEFAULT_UNITS: UnitsByPrincipal = {
  principal: [],
};

export const DEFAULT_COMPANIONS: Companion[] = [
  { id: "galih", name: "Galih", role: "Field Specialist" },
  { id: "farhan", name: "Farhan", role: "Field Specialist" },
  { id: "reza", name: "Reza", role: "Field Specialist" },
];

// ── Helpers ────────────────────────────────────────────────────────

export const fmt = (d: Date | string): string => {
  const dd = typeof d === "string" ? new Date(d + "T00:00:00") : new Date(d);
  return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
};

export const fmtDisplay = (d: Date | string): string => {
  const dd = typeof d === "string" ? new Date(d + "T00:00:00") : new Date(d);
  return dd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export const fmtDisplayShort = (d: Date | string): string => {
  const dd = typeof d === "string" ? new Date(d + "T00:00:00") : new Date(d);
  return dd.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export const addDays = (d: Date | string, n: number): Date => {
  const r = typeof d === "string" ? new Date(d + "T00:00:00") : new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const isSameDay = (a: Date | string, b: Date | string): boolean => fmt(a) === fmt(b);

export const isInRange = (date: Date | string, start: Date | string, end: Date | string): boolean => {
  const d = new Date(fmt(date)).getTime();
  const s = new Date(fmt(start)).getTime();
  const e = new Date(fmt(end)).getTime();
  return d >= s && d <= e;
};

export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

export const getFirstDayOfMonth = (year: number, month: number): number =>
  new Date(year, month, 1).getDay();

export const todayStr = (): string => fmt(new Date());

export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000
  );
}

export function getRentalDuration(rental: Rental): number {
  return daysBetween(rental.rentalStart, rental.rentalEnd) + 1;
}

export function isRentalActive(rental: Rental, date?: string): boolean {
  const d = date ?? todayStr();
  return rental.status !== "cancelled" && isInRange(d, rental.rentalStart, rental.rentalEnd);
}

export function isRentalToday(rental: Rental): boolean {
  return isRentalActive(rental, todayStr());
}

export function isRentalUpcoming(rental: Rental): boolean {
  const today = todayStr();
  return rental.status !== "cancelled" && rental.rentalStart > today;
}

export function getPrincipalById(id: string): Principal | undefined {
  return PRINCIPALS.find((p) => p.id === id);
}

export function getStatusMeta(status: RentalStatus) {
  return RENTAL_STATUSES.find((s) => s.value === status) ?? RENTAL_STATUSES[0];
}

// ── Storage (localStorage) ────────────────────────────────────────

export const STORAGE_KEYS = {
  rentals: "or-rentals",
  companions: "or-companions",
  units: "or-units",
} as const;

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Storage save failed:", e);
  }
}
