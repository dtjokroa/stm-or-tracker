import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── iCal helpers ──────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** YYYY-MM-DD → YYYYMMDD */
function toICalDate(s: string): string {
  return s.replace(/-/g, "");
}

/** YYYY-MM-DD → next day as YYYYMMDD (iCal DTEND for all-day is exclusive) */
function nextDay(s: string): string {
  const d = new Date(s + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function escIcal(s: string): string {
  return (s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold lines >75 chars per RFC 5545 §3.1 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    out.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return out.join("\r\n");
}

// ── Route handler ─────────────────────────────────────────────────

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return new NextResponse("Supabase not configured", { status: 503 });
  }

  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from("rentals")
    .select("*")
    .neq("status", "cancelled")
    .order("rental_start");

  if (error) {
    console.error("Calendar feed error:", error);
    return new NextResponse("Database error", { status: 500 });
  }

  const now = new Date()
    .toISOString()
    .replace(/[-:.]/g, "")
    .slice(0, 15) + "Z";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//STM IOM Tracker//EN",
    "X-WR-CALNAME:STM Field Schedule",
    "X-WR-CALDESC:STM IOM & ICP Monitor rental and rep deployments",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const row of data ?? []) {
    const isRepOnly = row.case_type === "rep-only";

    const summary = isRepOnly
      ? `[Rep] ${row.equipment_note || "Client Equipment"} @ ${row.hospital_name}`
      : `[Rental] ${row.unit_label} @ ${row.hospital_name}`;

    const descLines: string[] = [];
    if (row.companion_name) descLines.push(`Representative: ${row.companion_name}`);
    if (row.surgeon_name)   descLines.push(`Surgeon: ${row.surgeon_name}`);
    if (row.procedure)      descLines.push(`Procedure: ${row.procedure}`);
    if (row.department)     descLines.push(`Department: ${row.department}`);
    if (!isRepOnly && row.serial) descLines.push(`Serial: ${row.serial}`);
    if (isRepOnly && row.equipment_note) descLines.push(`Client Equipment: ${row.equipment_note}`);
    if (row.notes)          descLines.push(`Notes: ${row.notes}`);
    descLines.push(`Status: ${row.status}`);
    descLines.push(`Type: ${isRepOnly ? "Rep Deployment" : "Equipment Rental"}`);

    const location = `${row.hospital_name}${row.department ? ` – ${row.department}` : ""}`;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${row.id}@stm-iom-tracker`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${toICalDate(row.rental_start)}`);
    lines.push(`DTEND;VALUE=DATE:${nextDay(row.rental_end)}`);
    lines.push(fold(`SUMMARY:${escIcal(summary)}`));
    lines.push(fold(`DESCRIPTION:${escIcal(descLines.join("\n"))}`));
    lines.push(fold(`LOCATION:${escIcal(location)}`));
    if (row.updated_at) {
      lines.push(`LAST-MODIFIED:${row.updated_at.replace(/[-:.]/g, "").slice(0, 15)}Z`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="stm-field-schedule.ics"',
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
