import type { Companion, Rental, Unit, UnitsByPrincipal } from "@/app/lib/data";
import {
  COMPANION_ROLES,
  DEFAULT_COMPANIONS,
  DEFAULT_UNITS,
  PRINCIPALS,
  STORAGE_KEYS,
  loadFromStorage,
  normalizeStatus,
  saveToStorage,
} from "@/app/lib/data";
import { getSupabaseClient, shouldUseSupabase } from "@/app/lib/supabase";

// ── Row types (Supabase snake_case) ───────────────────────────────

interface RentalRow {
  id: string;
  principal_id: string;
  unit_id: string;
  unit_label: string;
  serial: string;
  hospital_name: string;
  department: string;
  surgeon_name: string;
  procedure: string;
  rental_start: string;
  rental_end: string;
  status: string;
  companion_id: string;
  companion_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface CompanionRow {
  id: string;
  name: string;
  role: string;
}

interface UnitRow {
  id: string;
  principal_id: string;
  name: string;
  serial: string;
  label: string;
}

// ── App state ─────────────────────────────────────────────────────

export interface AppState {
  rentals: Rental[];
  companions: Companion[];
  unitsByPrincipal: UnitsByPrincipal;
}

export type StorageStatus = "local" | "supabase" | "supabase-unavailable";

export interface LoadResult {
  state: AppState;
  storageStatus: StorageStatus;
  persistEnabled: boolean;
}

const DEFAULT_STATE: AppState = {
  rentals: [],
  companions: DEFAULT_COMPANIONS,
  unitsByPrincipal: DEFAULT_UNITS,
};

// ── Public API ────────────────────────────────────────────────────

export async function loadInitialState(): Promise<LoadResult> {
  const localState = loadFromLocalStorage();

  if (!shouldUseSupabase()) {
    return { state: localState, storageStatus: "local", persistEnabled: true };
  }

  try {
    const supabase = getSupabaseClient();
    const ready = await isSchemaReady(supabase);

    if (!ready) {
      return { state: localState, storageStatus: "supabase-unavailable", persistEnabled: false };
    }

    const remoteState = await loadFromSupabase(supabase);

    // If remote is empty and local has data → seed remote from local
    if (!hasData(remoteState) && hasData(localState)) {
      await syncToSupabase(supabase, localState);
      return { state: localState, storageStatus: "supabase", persistEnabled: true };
    }

    saveToLocalStorage(remoteState);
    return { state: remoteState, storageStatus: "supabase", persistEnabled: true };
  } catch (err) {
    console.warn("Supabase load failed — read-only fallback.", err);
    return { state: localState, storageStatus: "supabase-unavailable", persistEnabled: false };
  }
}

export async function persistState(
  state: AppState,
  opts?: { persistEnabled?: boolean }
): Promise<StorageStatus> {
  saveToLocalStorage(state);

  if (!shouldUseSupabase()) return "local";
  if (opts?.persistEnabled === false) return "supabase-unavailable";

  try {
    const supabase = getSupabaseClient();
    const ready = await isSchemaReady(supabase);
    if (!ready) return "supabase-unavailable";

    await syncToSupabase(supabase, state);
    return "supabase";
  } catch (err) {
    console.warn("Supabase save failed.", err);
    return "supabase-unavailable";
  }
}

// ── Schema probe ──────────────────────────────────────────────────

async function isSchemaReady(
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<boolean> {
  const { error } = await supabase.from("rentals").select("id").limit(1);
  if (!error) return true;
  if (error.code === "42P01" || error.message.includes("does not exist")) return false;
  throw error;
}

// ── Load from Supabase ────────────────────────────────────────────

async function loadFromSupabase(
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<AppState> {
  const [rentalsRes, companionsRes, unitsRes] = await Promise.all([
    supabase.from("rentals").select("*").order("rental_start", { ascending: false }),
    supabase.from("companions").select("*").order("name"),
    supabase.from("units").select("*"),
  ]);

  if (rentalsRes.error) throw rentalsRes.error;
  if (companionsRes.error) throw companionsRes.error;
  if (unitsRes.error) throw unitsRes.error;

  return {
    rentals: (rentalsRes.data as RentalRow[]).map(rowToRental),
    companions: normalizeCompanions((companionsRes.data as CompanionRow[]).map(rowToCompanion)),
    unitsByPrincipal: rowsToUnitsByPrincipal((unitsRes.data as UnitRow[]) ?? []),
  };
}

// ── Sync to Supabase (full upsert + delete stale) ─────────────────

async function syncToSupabase(
  supabase: ReturnType<typeof getSupabaseClient>,
  state: AppState
): Promise<void> {
  const rentalRows = state.rentals.map(rentalToRow);
  const companionRows = normalizeCompanions(state.companions).map(companionToRow);
  const unitRows = flattenUnits(state.unitsByPrincipal);

  // Rentals
  if (rentalRows.length) {
    const { error } = await supabase.from("rentals").upsert(rentalRows, { onConflict: "id" });
    if (error) throw error;
  }
  await deleteStale(supabase, "rentals", "id", rentalRows.map((r) => r.id));

  // Companions
  if (companionRows.length) {
    const { error } = await supabase.from("companions").upsert(companionRows, { onConflict: "id" });
    if (error) throw error;
  }
  await deleteStale(supabase, "companions", "id", companionRows.map((r) => r.id));

  // Units
  if (unitRows.length) {
    const { error } = await supabase.from("units").upsert(unitRows, { onConflict: "id" });
    if (error) throw error;
  }
  await deleteStale(supabase, "units", "id", unitRows.map((r) => r.id));
}

async function deleteStale(
  supabase: ReturnType<typeof getSupabaseClient>,
  table: string,
  column: string,
  keepIds: string[]
): Promise<void> {
  const { data, error } = await supabase.from(table).select(column);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stale = (data ?? []).map((r: any) => r[column] as string).filter((id: string) => !keepIds.includes(id));
  if (stale.length) {
    const { error: delErr } = await supabase.from(table).delete().in(column, stale);
    if (delErr) throw delErr;
  }
}

// ── Row converters ────────────────────────────────────────────────

function rentalToRow(r: Rental): RentalRow {
  return {
    id: r.id,
    principal_id: r.principalId,
    unit_id: r.unitId,
    unit_label: r.unitLabel,
    serial: r.serial,
    hospital_name: r.hospitalName,
    department: r.department,
    surgeon_name: r.surgeonName,
    procedure: r.procedure,
    rental_start: r.rentalStart,
    rental_end: r.rentalEnd,
    status: r.status,
    companion_id: r.companionId,
    companion_name: r.companionName,
    notes: r.notes,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function rowToRental(row: RentalRow): Rental {
  return {
    id: row.id,
    principalId: row.principal_id,
    unitId: row.unit_id,
    unitLabel: row.unit_label,
    serial: row.serial,
    hospitalName: row.hospital_name,
    department: row.department,
    surgeonName: row.surgeon_name,
    procedure: row.procedure,
    rentalStart: row.rental_start,
    rentalEnd: row.rental_end,
    status: normalizeStatus(row.status),
    companionId: row.companion_id,
    companionName: row.companion_name,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function companionToRow(c: Companion): CompanionRow {
  return { id: c.id, name: c.name, role: c.role };
}

function rowToCompanion(row: CompanionRow): Companion {
  const role = COMPANION_ROLES.includes(row.role as typeof COMPANION_ROLES[number])
    ? (row.role as typeof COMPANION_ROLES[number])
    : "Field Specialist";
  return { id: row.id, name: row.name, role };
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
    result[row.principal_id].push({
      id: row.id,
      name: row.name,
      serial: row.serial,
      label: row.label,
    });
  }
  return result;
}

// ── LocalStorage ──────────────────────────────────────────────────

function loadFromLocalStorage(): AppState {
  return {
    rentals: loadFromStorage<Rental[]>(STORAGE_KEYS.rentals, []).map(normalizeRental),
    companions: normalizeCompanions(loadFromStorage<Companion[]>(STORAGE_KEYS.companions, DEFAULT_COMPANIONS)),
    unitsByPrincipal: loadFromStorage<UnitsByPrincipal>(STORAGE_KEYS.units, DEFAULT_UNITS),
  };
}

function saveToLocalStorage(state: AppState): void {
  saveToStorage(STORAGE_KEYS.rentals, state.rentals);
  saveToStorage(STORAGE_KEYS.companions, state.companions);
  saveToStorage(STORAGE_KEYS.units, state.unitsByPrincipal);
}

// ── Normalizers ────────────────────────────────────────────────────

function normalizeRental(r: Rental): Rental {
  return { ...r, status: normalizeStatus(r.status), notes: r.notes ?? "" };
}

function normalizeCompanions(input: Companion[]): Companion[] {
  const seen = new Set<string>();
  const merged: Companion[] = [];
  for (const c of [...DEFAULT_COMPANIONS, ...input]) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      merged.push(c);
    }
  }
  return merged;
}

function hasData(state: AppState): boolean {
  return state.rentals.length > 0;
}
