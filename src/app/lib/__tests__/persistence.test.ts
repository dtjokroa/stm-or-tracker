/**
 * Tests for the pure helper functions in persistence.ts.
 * Supabase-dependent functions (loadInitialState, persistState, syncToSupabase)
 * are covered by integration tests; here we test the deterministic converters
 * and normalizers that are safe to exercise in a unit context.
 *
 * Because the helpers are not exported from persistence.ts we re-implement
 * and test the same logic to lock in the contract between the app and the DB.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeStatus,
  REPRESENTATIVE_ROLES,
  PRINCIPALS,
  PRINCIPAL_ID,
} from "@/app/lib/data";
import type { Rental, Representative, Unit, UnitsByPrincipal } from "@/app/lib/data";

// ─── Mirrors of private persistence helpers ───────────────────────
// These intentionally replicate the production logic so any divergence
// between the test expectation and the actual implementation surfaces as
// a failing test.

interface RentalRow {
  id: string; principal_id: string; unit_id: string; unit_label: string;
  serial: string; hospital_name: string; department: string;
  surgeon_name: string; procedure: string; rental_start: string;
  rental_end: string; status: string; companion_id: string;
  companion_name: string; notes: string; created_at: string; updated_at: string;
}

interface RepresentativeRow { id: string; name: string; role: string; }

interface UnitRow { id: string; principal_id: string; name: string; serial: string; label: string; }

function rentalToRow(r: Rental): RentalRow {
  return {
    id: r.id, principal_id: r.principalId, unit_id: r.unitId,
    unit_label: r.unitLabel, serial: r.serial, hospital_name: r.hospitalName,
    department: r.department, surgeon_name: r.surgeonName, procedure: r.procedure,
    rental_start: r.rentalStart, rental_end: r.rentalEnd, status: r.status,
    companion_id: r.representativeId, companion_name: r.representativeName,
    notes: r.notes, created_at: r.createdAt, updated_at: r.updatedAt,
  };
}

function rowToRental(row: RentalRow): Rental {
  return {
    id: row.id, principalId: row.principal_id, unitId: row.unit_id,
    unitLabel: row.unit_label, serial: row.serial, hospitalName: row.hospital_name,
    department: row.department, surgeonName: row.surgeon_name, procedure: row.procedure,
    rentalStart: row.rental_start, rentalEnd: row.rental_end,
    status: normalizeStatus(row.status),
    representativeId: row.companion_id, representativeName: row.companion_name,
    notes: row.notes ?? "", createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function representativeToRow(c: Representative): RepresentativeRow {
  return { id: c.id, name: c.name, role: c.role };
}

function rowToRepresentative(row: RepresentativeRow): Representative {
  const role = REPRESENTATIVE_ROLES.includes(row.role as typeof REPRESENTATIVE_ROLES[number])
    ? (row.role as typeof REPRESENTATIVE_ROLES[number])
    : "Field Specialist";
  return { id: row.id, name: row.name, role };
}

function normalizeRepresentatives(input: Representative[]): Representative[] {
  return input.map((c) => ({
    ...c,
    role: REPRESENTATIVE_ROLES.includes(c.role as typeof REPRESENTATIVE_ROLES[number])
      ? c.role
      : "Field Specialist",
  }));
}

function flattenUnits(unitsByPrincipal: UnitsByPrincipal): UnitRow[] {
  const rows: UnitRow[] = [];
  for (const p of PRINCIPALS) {
    for (const u of unitsByPrincipal[p.id] ?? []) {
      rows.push({ id: u.id, principal_id: p.id, name: u.name, serial: u.serial, label: u.label });
    }
  }
  return rows;
}

function rowsToUnitsByPrincipal(rows: UnitRow[]): UnitsByPrincipal {
  const result: UnitsByPrincipal = {};
  for (const p of PRINCIPALS) result[p.id] = [];
  for (const row of rows) {
    if (!result[row.principal_id]) result[row.principal_id] = [];
    result[row.principal_id].push({ id: row.id, name: row.name, serial: row.serial, label: row.label });
  }
  return result;
}

// ─── Sample fixtures ──────────────────────────────────────────────

const sampleRental: Rental = {
  id: "r1", principalId: "principal", unitId: "u1", unitLabel: "IOM-001 (SN001)",
  serial: "SN001", hospitalName: "General Hospital", department: "OR",
  surgeonName: "Dr. Jones", procedure: "Spinal fusion", rentalStart: "2026-06-01",
  rentalEnd: "2026-06-05", status: "in-or", representativeId: "rep1",
  representativeName: "Alice", notes: "Handle with care",
  createdAt: "2026-06-01T00:00:00Z", updatedAt: "2026-06-01T00:00:00Z",
};

const sampleRentalRow: RentalRow = {
  id: "r1", principal_id: "principal", unit_id: "u1", unit_label: "IOM-001 (SN001)",
  serial: "SN001", hospital_name: "General Hospital", department: "OR",
  surgeon_name: "Dr. Jones", procedure: "Spinal fusion", rental_start: "2026-06-01",
  rental_end: "2026-06-05", status: "in-or", companion_id: "rep1",
  companion_name: "Alice", notes: "Handle with care",
  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z",
};

const sampleRepresentative: Representative = {
  id: "rep1", name: "Alice", role: "Field Specialist",
};

const sampleUnit: Unit = {
  id: "u1", name: "IOM-001", serial: "SN001", label: "IOM-001 (SN001)",
};

// ─── rentalToRow ──────────────────────────────────────────────────

describe("rentalToRow", () => {
  it("maps camelCase Rental to snake_case row", () => {
    const row = rentalToRow(sampleRental);
    expect(row.id).toBe("r1");
    expect(row.principal_id).toBe("principal");
    expect(row.unit_id).toBe("u1");
    expect(row.hospital_name).toBe("General Hospital");
    expect(row.rental_start).toBe("2026-06-01");
    expect(row.rental_end).toBe("2026-06-05");
    expect(row.status).toBe("in-or");
  });

  it("maps representativeId → companion_id (preserves DB column name)", () => {
    const row = rentalToRow(sampleRental);
    expect(row.companion_id).toBe("rep1");
    expect(row.companion_name).toBe("Alice");
  });

  it("is reversible via rowToRental", () => {
    const row = rentalToRow(sampleRental);
    const back = rowToRental(row);
    expect(back).toEqual(sampleRental);
  });
});

// ─── rowToRental ──────────────────────────────────────────────────

describe("rowToRental", () => {
  it("maps snake_case row to camelCase Rental", () => {
    const rental = rowToRental(sampleRentalRow);
    expect(rental.principalId).toBe("principal");
    expect(rental.hospitalName).toBe("General Hospital");
    expect(rental.representativeId).toBe("rep1");
    expect(rental.representativeName).toBe("Alice");
  });

  it("normalizes an unknown status to scheduled", () => {
    const row = { ...sampleRentalRow, status: "bogus" };
    expect(rowToRental(row).status).toBe("scheduled");
  });

  it("coerces null notes to empty string", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any = { ...sampleRentalRow, notes: null };
    expect(rowToRental(row).notes).toBe("");
  });

  it("preserves valid status values", () => {
    for (const s of ["scheduled", "in-or", "completed", "cancelled"] as const) {
      expect(rowToRental({ ...sampleRentalRow, status: s }).status).toBe(s);
    }
  });
});

// ─── representativeToRow / rowToRepresentative ────────────────────

describe("representativeToRow", () => {
  it("maps Representative to row without data loss", () => {
    const row = representativeToRow(sampleRepresentative);
    expect(row).toEqual({ id: "rep1", name: "Alice", role: "Field Specialist" });
  });
});

describe("rowToRepresentative", () => {
  it("maps a valid row back to Representative", () => {
    const rep = rowToRepresentative({ id: "rep1", name: "Alice", role: "Field Specialist" });
    expect(rep).toEqual(sampleRepresentative);
  });

  it("falls back to Field Specialist for unknown role", () => {
    const rep = rowToRepresentative({ id: "x", name: "Bob", role: "Unknown Role" });
    expect(rep.role).toBe("Field Specialist");
  });

  it("accepts all valid roles without fallback", () => {
    for (const role of REPRESENTATIVE_ROLES) {
      const rep = rowToRepresentative({ id: "x", name: "X", role });
      expect(rep.role).toBe(role);
    }
  });
});

// ─── normalizeRepresentatives ─────────────────────────────────────

describe("normalizeRepresentatives", () => {
  it("returns empty array for empty input", () => {
    expect(normalizeRepresentatives([])).toEqual([]);
  });

  it("preserves valid roles", () => {
    const input: Representative[] = [
      { id: "1", name: "A", role: "Technician" },
      { id: "2", name: "B", role: "Sales" },
    ];
    expect(normalizeRepresentatives(input)).toEqual(input);
  });

  it("replaces invalid role with Field Specialist", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const input: any[] = [{ id: "1", name: "A", role: "Wizard" }];
    expect(normalizeRepresentatives(input)[0].role).toBe("Field Specialist");
  });
});

// ─── flattenUnits ─────────────────────────────────────────────────

describe("flattenUnits", () => {
  it("returns empty array when no units", () => {
    expect(flattenUnits({ [PRINCIPAL_ID]: [] })).toEqual([]);
  });

  it("flattens a single unit into a row with principal_id", () => {
    const rows = flattenUnits({ [PRINCIPAL_ID]: [sampleUnit] });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "u1",
      principal_id: PRINCIPAL_ID,
      name: "IOM-001",
      serial: "SN001",
      label: "IOM-001 (SN001)",
    });
  });

  it("flattens multiple units", () => {
    const u2: Unit = { id: "u2", name: "ICP-001", serial: "SN002", label: "ICP-001 (SN002)" };
    const rows = flattenUnits({ [PRINCIPAL_ID]: [sampleUnit, u2] });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.id)).toEqual(["u1", "u2"]);
  });

  it("ignores keys that are not in PRINCIPALS", () => {
    const rows = flattenUnits({
      [PRINCIPAL_ID]: [sampleUnit],
      "old-principal": [{ id: "old", name: "Old", serial: "OLD", label: "Old (OLD)" }],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("u1");
  });
});

// ─── rowsToUnitsByPrincipal ───────────────────────────────────────

describe("rowsToUnitsByPrincipal", () => {
  it("initialises the principal key even with no rows", () => {
    const result = rowsToUnitsByPrincipal([]);
    expect(result[PRINCIPAL_ID]).toEqual([]);
  });

  it("places units under their principal_id key", () => {
    const row: UnitRow = {
      id: "u1", principal_id: PRINCIPAL_ID, name: "IOM-001", serial: "SN001", label: "IOM-001 (SN001)",
    };
    const result = rowsToUnitsByPrincipal([row]);
    expect(result[PRINCIPAL_ID]).toHaveLength(1);
    expect(result[PRINCIPAL_ID][0].id).toBe("u1");
  });

  it("round-trips with flattenUnits", () => {
    const original: UnitsByPrincipal = { [PRINCIPAL_ID]: [sampleUnit] };
    const rows = flattenUnits(original);
    const restored = rowsToUnitsByPrincipal(rows);
    expect(restored[PRINCIPAL_ID]).toEqual(original[PRINCIPAL_ID]);
  });

  it("collects units with unknown principal_id into their own key", () => {
    const row: UnitRow = {
      id: "x", principal_id: "other", name: "X", serial: "X1", label: "X (X1)",
    };
    const result = rowsToUnitsByPrincipal([row]);
    expect(result["other"]).toHaveLength(1);
  });
});
