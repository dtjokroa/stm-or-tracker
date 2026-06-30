import type { Representative, Rental, Unit, UnitsByPrincipal } from "@/app/lib/data";
import {
  REPRESENTATIVE_ROLES,
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
  case_type: string;
  unit_id: string;
  unit_label: string;
  serial: string;
  equipment_note: string;
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

interface RepresentativeRow {
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
  representatives: Representative[];
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
  representatives: [],
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
  const [rentalsRes, representativesRes, unitsRes] = await Promise.all([
    supabase.from("rentals").select("*").order("rental_start", { ascending: false }),
    supabase.from("companions").select("*").order("name"),
    supabase.from("units").select("*"),
  ]);

  if (rentalsRes.error) throw rentalsRes.error;
  if (representativesRes.error) throw representativesRes.error;
  if (unitsRes.error) throw unitsRes.error;

  return {
    rentals: (rentalsRes.data as RentalRow[]).map(rowToRental),
    representatives: normalizeRepresentatives((representativesRes.data as RepresentativeRow[]).map(rowToRepresentative)),
    unitsByPrincipal: rowsToUnitsByPrincipal((unitsRes.data as UnitRow[]) ?? []),
  };
}

// ── Sync to Supabase (full upsert + delete stale) ─────────────────

async function syncToSupabase(
  supabase: ReturnType<typeof getSupabaseClient>,
  state: AppState
): Promise<void> {
  const rentalRows = state.rentals.map(rentalToRow);
  const representativeRows = normalizeRepresentatives(state.representatives).map(representativeToRow);
  const unitRows = flattenUnits(state.unitsByPrincipal);

  // Principals — must be upserted before units due to FK constraint
  const principalRows = PRINCIPALS.map((p) => ({ id: p.id, name: p.name, color: p.color }));
  if (principalRows.length) {
    const { error } = await supabase.from("principals").upsert(principalRows, { onConflict: "id" });
    if (error) throw error;
  }

  // Rentals
  if (rentalRows.length) {
    const { error } = await supabase.from("rentals").upsert(rentalRows, { onConflict: "id" });
    if (error) throw error;
  }
  await deleteStale(supabase, "rentals", "id", rentalRows.map((r) => r.id));

  // Representatives (stored in companions table)
  if (representativeRows.length) {
    const { error } = await supabase.from("companions").upsert(representativeRows, { onConflict: "id" });
    if (error) throw error;
  }
  await deleteStale(supabase, "companions", "id", representativeRows.map((r) => r.id));

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
    case_type: r.caseType ?? "rental",
    unit_id: r.unitId,
    unit_label: r.unitLabel,
    serial: r.serial,
    equipment_note: r.equipmentNote ?? "",
    hospital_name: r.hospitalName,
    department: r.department,
    surgeon_name: r.surgeonName,
    procedure: r.procedure,
    rental_start: r.rentalStart,
    rental_end: r.rentalEnd,
    status: r.status,
    companion_id: r.representativeId,
    companion_name: r.representativeName,
    notes: r.notes,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function rowToRental(row: RentalRow): Rental {
  return {
    id: row.id,
    principalId: row.principal_id,
    caseType: row.case_type === "rep-only" ? "rep-only" : "rental",
    unitId: row.unit_id,
    unitLabel: row.unit_label,
    serial: row.serial,
    equipmentNote: row.equipment_note ?? "",
    hospitalName: row.hospital_name,
    department: row.department,
    surgeonName: row.surgeon_name,
    procedure: row.procedure,
    rentalStart: row.rental_start,
    rentalEnd: row.rental_end,
    status: normalizeStatus(row.status),
    representativeId: row.companion_id,
    representativeName: row.companion_name,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    representatives: normalizeRepresentatives(loadFromStorage<Representative[]>(STORAGE_KEYS.representatives, [])),
    unitsByPrincipal: loadFromStorage<UnitsByPrincipal>(STORAGE_KEYS.units, DEFAULT_UNITS),
  };
}

function saveToLocalStorage(state: AppState): void {
  saveToStorage(STORAGE_KEYS.rentals, state.rentals);
  saveToStorage(STORAGE_KEYS.representatives, state.representatives);
  saveToStorage(STORAGE_KEYS.units, state.unitsByPrincipal);
}

// ── Normalizers ────────────────────────────────────────────────────

function normalizeRental(r: Rental): Rental {
  return {
    ...r,
    status: normalizeStatus(r.status),
    notes: r.notes ?? "",
    caseType: r.caseType === "rep-only" ? "rep-only" : "rental",
    equipmentNote: r.equipmentNote ?? "",
  };
}

function normalizeRepresentatives(input: Representative[]): Representative[] {
  return input.map((c) => ({
    ...c,
    role: REPRESENTATIVE_ROLES.includes(c.role as typeof REPRESENTATIVE_ROLES[number])
      ? c.role
      : "Field Specialist",
  }));
}

function hasData(state: AppState): boolean {
  return state.rentals.length > 0;
}
