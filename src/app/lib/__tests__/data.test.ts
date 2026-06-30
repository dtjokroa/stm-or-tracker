import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fmt,
  fmtDisplay,
  fmtDisplayShort,
  addDays,
  isSameDay,
  isInRange,
  normalizeStatus,
  daysBetween,
  getRentalDuration,
  isRentalActive,
  isRentalToday,
  isRentalUpcoming,
  getStatusMeta,
  getPrincipalById,
  uid,
  getDaysInMonth,
  getFirstDayOfMonth,
  todayStr,
  loadFromStorage,
  saveToStorage,
  PRINCIPALS,
  PRINCIPAL_ID,
  RENTAL_STATUSES,
  REPRESENTATIVE_ROLES,
  DEFAULT_UNITS,
  DEFAULT_REPRESENTATIVES,
} from "@/app/lib/data";
import type { Rental } from "@/app/lib/data";

// ─── Helpers ──────────────────────────────────────────────────────

function makeRental(overrides: Partial<Rental> = {}): Rental {
  return {
    id: "test-id",
    principalId: "principal",
    caseType: "rental",
    unitId: "u1",
    unitLabel: "IOM-001 (SN001)",
    serial: "SN001",
    equipmentNote: "",
    hospitalName: "Test Hospital",
    department: "OR",
    surgeonName: "Dr. Smith",
    procedure: "Craniotomy",
    rentalStart: "2026-06-01",
    rentalEnd: "2026-06-05",
    startTime: "",
    endTime: "",
    status: "scheduled",
    representativeId: "",
    representativeName: "",
    notes: "",
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

// ─── fmt ──────────────────────────────────────────────────────────

describe("fmt", () => {
  it("formats a Date object to YYYY-MM-DD", () => {
    expect(fmt(new Date(2026, 5, 15))).toBe("2026-06-15");
  });

  it("formats a date string without timezone shift", () => {
    expect(fmt("2026-01-01")).toBe("2026-01-01");
  });

  it("pads month and day with leading zeros", () => {
    expect(fmt("2026-03-07")).toBe("2026-03-07");
  });

  it("handles end-of-year date", () => {
    expect(fmt("2026-12-31")).toBe("2026-12-31");
  });
});

// ─── fmtDisplay ───────────────────────────────────────────────────

describe("fmtDisplay", () => {
  it("returns a human-readable date string", () => {
    const result = fmtDisplay("2026-06-15");
    expect(result).toMatch(/15/);
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/2026/);
  });

  it("formats a Date object", () => {
    const result = fmtDisplay(new Date(2026, 0, 1));
    expect(result).toMatch(/1/);
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/2026/);
  });
});

// ─── fmtDisplayShort ──────────────────────────────────────────────

describe("fmtDisplayShort", () => {
  it("omits the year", () => {
    const result = fmtDisplayShort("2026-06-15");
    expect(result).not.toMatch(/2026/);
    expect(result).toMatch(/Jun/);
  });
});

// ─── addDays ──────────────────────────────────────────────────────

describe("addDays", () => {
  it("adds positive days", () => {
    expect(fmt(addDays("2026-06-01", 5))).toBe("2026-06-06");
  });

  it("subtracts days with negative n", () => {
    expect(fmt(addDays("2026-06-10", -3))).toBe("2026-06-07");
  });

  it("crosses month boundary", () => {
    expect(fmt(addDays("2026-01-30", 3))).toBe("2026-02-02");
  });

  it("crosses year boundary", () => {
    expect(fmt(addDays("2026-12-30", 3))).toBe("2027-01-02");
  });

  it("adds zero days", () => {
    expect(fmt(addDays("2026-06-15", 0))).toBe("2026-06-15");
  });

  it("accepts a Date object", () => {
    expect(fmt(addDays(new Date(2026, 5, 1), 1))).toBe("2026-06-02");
  });
});

// ─── isSameDay ────────────────────────────────────────────────────

describe("isSameDay", () => {
  it("returns true for identical date strings", () => {
    expect(isSameDay("2026-06-15", "2026-06-15")).toBe(true);
  });

  it("returns false for different dates", () => {
    expect(isSameDay("2026-06-15", "2026-06-16")).toBe(false);
  });

  it("compares Date objects", () => {
    expect(isSameDay(new Date(2026, 5, 1), "2026-06-01")).toBe(true);
  });
});

// ─── isInRange ────────────────────────────────────────────────────

describe("isInRange", () => {
  it("returns true when date equals start", () => {
    expect(isInRange("2026-06-01", "2026-06-01", "2026-06-05")).toBe(true);
  });

  it("returns true when date equals end", () => {
    expect(isInRange("2026-06-05", "2026-06-01", "2026-06-05")).toBe(true);
  });

  it("returns true for mid-range date", () => {
    expect(isInRange("2026-06-03", "2026-06-01", "2026-06-05")).toBe(true);
  });

  it("returns false for date before range", () => {
    expect(isInRange("2026-05-31", "2026-06-01", "2026-06-05")).toBe(false);
  });

  it("returns false for date after range", () => {
    expect(isInRange("2026-06-06", "2026-06-01", "2026-06-05")).toBe(false);
  });
});

// ─── normalizeStatus ──────────────────────────────────────────────

describe("normalizeStatus", () => {
  it("returns in-or", () => {
    expect(normalizeStatus("in-or")).toBe("in-or");
  });

  it("returns completed", () => {
    expect(normalizeStatus("completed")).toBe("completed");
  });

  it("returns cancelled", () => {
    expect(normalizeStatus("cancelled")).toBe("cancelled");
  });

  it("defaults unknown value to scheduled", () => {
    expect(normalizeStatus("unknown")).toBe("scheduled");
  });

  it("defaults null to scheduled", () => {
    expect(normalizeStatus(null)).toBe("scheduled");
  });

  it("defaults undefined to scheduled", () => {
    expect(normalizeStatus(undefined)).toBe("scheduled");
  });

  it("defaults empty string to scheduled", () => {
    expect(normalizeStatus("")).toBe("scheduled");
  });
});

// ─── daysBetween ──────────────────────────────────────────────────

describe("daysBetween", () => {
  it("returns 0 for same date", () => {
    expect(daysBetween("2026-06-01", "2026-06-01")).toBe(0);
  });

  it("returns correct positive days", () => {
    expect(daysBetween("2026-06-01", "2026-06-05")).toBe(4);
  });

  it("returns negative for reversed order", () => {
    expect(daysBetween("2026-06-05", "2026-06-01")).toBe(-4);
  });

  it("handles month boundaries", () => {
    expect(daysBetween("2026-01-28", "2026-02-01")).toBe(4);
  });
});

// ─── getRentalDuration ────────────────────────────────────────────

describe("getRentalDuration", () => {
  it("returns 1 for same-day rental", () => {
    const r = makeRental({ rentalStart: "2026-06-01", rentalEnd: "2026-06-01" });
    expect(getRentalDuration(r)).toBe(1);
  });

  it("returns inclusive day count", () => {
    const r = makeRental({ rentalStart: "2026-06-01", rentalEnd: "2026-06-05" });
    expect(getRentalDuration(r)).toBe(5);
  });
});

// ─── isRentalActive ───────────────────────────────────────────────

describe("isRentalActive", () => {
  it("returns true when date is within range and not cancelled", () => {
    const r = makeRental({ rentalStart: "2026-06-01", rentalEnd: "2026-06-10", status: "scheduled" });
    expect(isRentalActive(r, "2026-06-05")).toBe(true);
  });

  it("returns false when status is cancelled", () => {
    const r = makeRental({ rentalStart: "2026-06-01", rentalEnd: "2026-06-10", status: "cancelled" });
    expect(isRentalActive(r, "2026-06-05")).toBe(false);
  });

  it("returns false when date is before range", () => {
    const r = makeRental({ rentalStart: "2026-06-05", rentalEnd: "2026-06-10", status: "scheduled" });
    expect(isRentalActive(r, "2026-06-01")).toBe(false);
  });

  it("returns false when date is after range", () => {
    const r = makeRental({ rentalStart: "2026-06-01", rentalEnd: "2026-06-05", status: "in-or" });
    expect(isRentalActive(r, "2026-06-10")).toBe(false);
  });

  it("returns true on the start date", () => {
    const r = makeRental({ rentalStart: "2026-06-01", rentalEnd: "2026-06-05", status: "in-or" });
    expect(isRentalActive(r, "2026-06-01")).toBe(true);
  });

  it("returns true on the end date", () => {
    const r = makeRental({ rentalStart: "2026-06-01", rentalEnd: "2026-06-05", status: "in-or" });
    expect(isRentalActive(r, "2026-06-05")).toBe(true);
  });
});

// ─── isRentalToday ────────────────────────────────────────────────

describe("isRentalToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for rental active today", () => {
    const r = makeRental({ rentalStart: "2026-06-28", rentalEnd: "2026-06-30", status: "in-or" });
    expect(isRentalToday(r)).toBe(true);
  });

  it("returns false for past rental", () => {
    const r = makeRental({ rentalStart: "2026-06-01", rentalEnd: "2026-06-10", status: "completed" });
    expect(isRentalToday(r)).toBe(false);
  });
});

// ─── isRentalUpcoming ─────────────────────────────────────────────

describe("isRentalUpcoming", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true for future rental", () => {
    const r = makeRental({ rentalStart: "2026-07-01", rentalEnd: "2026-07-05", status: "scheduled" });
    expect(isRentalUpcoming(r)).toBe(true);
  });

  it("returns false for today's rental", () => {
    const r = makeRental({ rentalStart: "2026-06-29", rentalEnd: "2026-07-01", status: "scheduled" });
    expect(isRentalUpcoming(r)).toBe(false);
  });

  it("returns false for cancelled future rental", () => {
    const r = makeRental({ rentalStart: "2026-07-01", rentalEnd: "2026-07-05", status: "cancelled" });
    expect(isRentalUpcoming(r)).toBe(false);
  });

  it("returns false for past rental", () => {
    const r = makeRental({ rentalStart: "2026-06-01", rentalEnd: "2026-06-10", status: "completed" });
    expect(isRentalUpcoming(r)).toBe(false);
  });
});

// ─── getStatusMeta ────────────────────────────────────────────────

describe("getStatusMeta", () => {
  it("returns correct meta for scheduled", () => {
    expect(getStatusMeta("scheduled").label).toBe("Scheduled");
  });

  it("returns correct meta for in-or", () => {
    expect(getStatusMeta("in-or").label).toBe("In OR");
  });

  it("returns correct meta for completed", () => {
    expect(getStatusMeta("completed").label).toBe("Completed");
  });

  it("returns correct meta for cancelled", () => {
    expect(getStatusMeta("cancelled").label).toBe("Cancelled");
  });

  it("returns a color hex string for each status", () => {
    for (const s of RENTAL_STATUSES) {
      expect(getStatusMeta(s.value).color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

// ─── getPrincipalById ─────────────────────────────────────────────

describe("getPrincipalById", () => {
  it("returns the principal for the known id", () => {
    const p = getPrincipalById("principal");
    expect(p).toBeDefined();
    expect(p?.id).toBe("principal");
  });

  it("returns undefined for unknown id", () => {
    expect(getPrincipalById("nonexistent")).toBeUndefined();
  });
});

// ─── getDaysInMonth ───────────────────────────────────────────────

describe("getDaysInMonth", () => {
  it("returns 31 for January", () => {
    expect(getDaysInMonth(2026, 0)).toBe(31);
  });

  it("returns 28 for February in non-leap year", () => {
    expect(getDaysInMonth(2026, 1)).toBe(28);
  });

  it("returns 29 for February in leap year", () => {
    expect(getDaysInMonth(2024, 1)).toBe(29);
  });

  it("returns 30 for April", () => {
    expect(getDaysInMonth(2026, 3)).toBe(30);
  });

  it("returns 31 for December", () => {
    expect(getDaysInMonth(2026, 11)).toBe(31);
  });
});

// ─── getFirstDayOfMonth ───────────────────────────────────────────

describe("getFirstDayOfMonth", () => {
  it("returns a number 0–6", () => {
    const day = getFirstDayOfMonth(2026, 5);
    expect(day).toBeGreaterThanOrEqual(0);
    expect(day).toBeLessThanOrEqual(6);
  });

  it("June 2026 starts on Monday (1)", () => {
    expect(getFirstDayOfMonth(2026, 5)).toBe(1);
  });
});

// ─── uid ──────────────────────────────────────────────────────────

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(typeof uid()).toBe("string");
    expect(uid().length).toBeGreaterThan(0);
  });

  it("returns unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 100 }, uid));
    expect(ids.size).toBe(100);
  });
});

// ─── todayStr ─────────────────────────────────────────────────────

describe("todayStr", () => {
  it("matches YYYY-MM-DD format", () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today's date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T12:00:00Z"));
    expect(todayStr()).toBe("2026-06-29");
    vi.useRealTimers();
  });
});

// ─── Constants ────────────────────────────────────────────────────

describe("PRINCIPALS", () => {
  it("has exactly one entry", () => {
    expect(PRINCIPALS).toHaveLength(1);
  });

  it("PRINCIPAL_ID matches first principal id", () => {
    expect(PRINCIPAL_ID).toBe(PRINCIPALS[0].id);
  });

  it("principal has required shape", () => {
    expect(PRINCIPALS[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      color: expect.stringMatching(/^#[0-9a-f]{6}$/i),
    });
  });
});

describe("REPRESENTATIVE_ROLES", () => {
  it("contains expected roles", () => {
    expect(REPRESENTATIVE_ROLES).toContain("Field Specialist");
    expect(REPRESENTATIVE_ROLES).toContain("Product Specialist");
    expect(REPRESENTATIVE_ROLES).toContain("Technician");
  });
});

describe("DEFAULT_UNITS", () => {
  it("has an empty array for the principal key", () => {
    expect(DEFAULT_UNITS[PRINCIPAL_ID]).toEqual([]);
  });
});

describe("DEFAULT_REPRESENTATIVES", () => {
  it("is an empty array", () => {
    expect(DEFAULT_REPRESENTATIVES).toEqual([]);
  });
});

// ─── localStorage helpers ─────────────────────────────────────────

describe("loadFromStorage / saveToStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns fallback when key is absent", () => {
    expect(loadFromStorage("missing-key", [])).toEqual([]);
  });

  it("round-trips a value", () => {
    const data = [{ id: "1", name: "Test" }];
    saveToStorage("test-key", data);
    expect(loadFromStorage("test-key", [])).toEqual(data);
  });

  it("returns fallback on malformed JSON", () => {
    localStorage.setItem("bad-key", "{ not json }");
    expect(loadFromStorage("bad-key", "fallback")).toBe("fallback");
  });

  it("persists different types: string, number, boolean", () => {
    saveToStorage("str", "hello");
    saveToStorage("num", 42);
    saveToStorage("bool", true);
    expect(loadFromStorage("str", "")).toBe("hello");
    expect(loadFromStorage("num", 0)).toBe(42);
    expect(loadFromStorage("bool", false)).toBe(true);
  });
});
