"use client";

import { useMemo } from "react";
import { Clock, CheckCircle, User, Building2, ArrowRight, Package, UserCheck, Stethoscope, MapPin } from "lucide-react";
import type { Representative, Rental } from "@/app/lib/data";
import {
  fmtDisplayShort,
  getStatusMeta,
  isRentalActive,
  isRentalToday,
  isRentalUpcoming,
  todayStr,
} from "@/app/lib/data";

interface Props {
  rentals: Rental[];
  representatives: Representative[];
  onEditRental: (rental: Rental) => void;
}

export default function Dashboard({ rentals, representatives, onEditRental }: Props) {
  const today = todayStr();

  const todayCases = useMemo(() => rentals.filter((r) => isRentalToday(r)), [rentals]);
  const upcomingCases = useMemo(
    () =>
      rentals
        .filter((r) => isRentalUpcoming(r))
        .sort((a, b) => a.rentalStart.localeCompare(b.rentalStart))
        .slice(0, 8),
    [rentals]
  );

  const activeCount = rentals.filter((r) => isRentalActive(r)).length;
  const scheduledCount = rentals.filter((r) => r.status === "scheduled").length;
  const completedCount = rentals.filter((r) => r.status === "completed").length;
  const inFieldCount = useMemo(() => {
    const ids = new Set(todayCases.filter((r) => r.representativeId).map((r) => r.representativeId));
    return ids.size;
  }, [todayCases]);

  // Build rep status cards: for each rep, show their today + next upcoming
  const repStatus = useMemo(() => {
    return representatives.map((rep) => {
      const todayAssignments = todayCases.filter((r) => r.representativeId === rep.id);
      const nextUpcoming = rentals
        .filter((r) => r.representativeId === rep.id && isRentalUpcoming(r))
        .sort((a, b) => a.rentalStart.localeCompare(b.rentalStart))[0];
      return { rep, todayAssignments, nextUpcoming };
    });
  }, [representatives, todayCases, rentals]);

  const repsInField = repStatus.filter((r) => r.todayAssignments.length > 0);
  const repsAvailable = repStatus.filter((r) => r.todayAssignments.length === 0);

  return (
    <div className="space-y-6">

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<MapPin size={16} className="text-green-600" />} bg="bg-green-50" label="In Field Today" value={inFieldCount} />
        <StatCard icon={<Clock size={16} className="text-amber-600" />} bg="bg-amber-50" label="Scheduled" value={scheduledCount} />
        <StatCard icon={<CheckCircle size={16} className="text-indigo-600" />} bg="bg-indigo-50" label="Completed" value={completedCount} />
        <StatCard icon={<User size={16} className="text-blue-600" />} bg="bg-blue-50" label="Active Cases" value={activeCount} />
      </div>

      {/* Field Team — today's rep deployment map */}
      {representatives.length > 0 && (
        <Section title="Field Team Status" count={representatives.length}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {repsInField.map(({ rep, todayAssignments }) => (
              <RepCard
                key={rep.id}
                rep={rep}
                assignments={todayAssignments}
                onEdit={onEditRental}
                status="active"
              />
            ))}
            {repsAvailable.map(({ rep, nextUpcoming }) => (
              <RepCard
                key={rep.id}
                rep={rep}
                assignments={nextUpcoming ? [nextUpcoming] : []}
                onEdit={onEditRental}
                status={nextUpcoming ? "upcoming" : "available"}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Today's cases */}
      <Section title="Today's Cases" count={todayCases.length} empty="Nothing scheduled for today.">
        {todayCases.map((r) => (
          <CaseCard key={r.id} rental={r} onClick={() => onEditRental(r)} />
        ))}
      </Section>

      {/* Upcoming */}
      <Section title="Upcoming Schedule" count={upcomingCases.length} empty="No upcoming cases.">
        {upcomingCases.map((r) => (
          <CaseCard key={r.id} rental={r} onClick={() => onEditRental(r)} compact />
        ))}
      </Section>
    </div>
  );
}

// ── Rep field status card ─────────────────────────────────────────

function RepCard({
  rep,
  assignments,
  onEdit,
  status,
}: {
  rep: Representative;
  assignments: Rental[];
  onEdit: (r: Rental) => void;
  status: "active" | "upcoming" | "available";
}) {
  const statusStyles = {
    active: { dot: "bg-green-500", ring: "ring-green-200", label: "In Field Today", labelColor: "text-green-700 bg-green-50" },
    upcoming: { dot: "bg-amber-400", ring: "ring-amber-200", label: "Next: " + (assignments[0] ? fmtDisplayShort(assignments[0].rentalStart) : ""), labelColor: "text-amber-700 bg-amber-50" },
    available: { dot: "bg-gray-300", ring: "ring-gray-200", label: "Available", labelColor: "text-gray-500 bg-gray-100" },
  }[status];

  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-4 ring-1 ${statusStyles.ring}`}>
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
            {rep.name[0]}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusStyles.dot}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{rep.name}</p>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyles.labelColor}`}>
              {statusStyles.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{rep.role}</p>

          {assignments.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {assignments.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onEdit(r)}
                  className="w-full text-left rounded-lg bg-gray-50 hover:bg-gray-100 px-2.5 py-2 transition-colors group"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {r.caseType === "rep-only" ? (
                      <UserCheck size={11} className="text-teal-500 flex-shrink-0" />
                    ) : (
                      <Package size={11} className="text-blue-500 flex-shrink-0" />
                    )}
                    <span className="text-xs font-medium text-gray-800 truncate">
                      {r.caseType === "rep-only"
                        ? (r.equipmentNote || "Client's equipment")
                        : r.unitLabel.split(" (")[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Building2 size={10} />{r.hospitalName}</span>
                    {r.surgeonName && <span className="flex items-center gap-1"><Stethoscope size={10} />{r.surgeonName}</span>}
                  </div>
                  {r.procedure && (
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{r.procedure}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Case card ─────────────────────────────────────────────────────

function CaseCard({
  rental,
  onClick,
  compact = false,
}: {
  rental: Rental;
  onClick: () => void;
  compact?: boolean;
}) {
  const statusMeta = getStatusMeta(rental.status);
  const isRental = rental.caseType !== "rep-only";

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all p-4 group"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ backgroundColor: isRental ? "#2563eb" : "#0d9488" }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isRental ? (
              <Package size={13} className="text-blue-500 flex-shrink-0" />
            ) : (
              <UserCheck size={13} className="text-teal-500 flex-shrink-0" />
            )}
            <span className="text-sm font-semibold text-gray-900 truncate">
              {isRental
                ? rental.unitLabel
                : (rental.equipmentNote || "Client's Equipment")}
            </span>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white flex-shrink-0"
              style={{ backgroundColor: statusMeta.color }}
            >
              {statusMeta.label}
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${isRental ? "bg-blue-50 text-blue-600" : "bg-teal-50 text-teal-600"}`}>
              {isRental ? "Rental" : "Rep Only"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 size={11} />
              {rental.hospitalName}
              {rental.department && ` · ${rental.department}`}
            </span>
            {rental.representativeName && (
              <span className="flex items-center gap-1">
                <User size={11} />
                <strong className="text-gray-700">{rental.representativeName}</strong>
              </span>
            )}
            {rental.surgeonName && !compact && (
              <span className="flex items-center gap-1">
                <Stethoscope size={11} />
                {rental.surgeonName}
              </span>
            )}
          </div>
          {!compact && rental.procedure && (
            <p className="text-xs text-gray-400 mt-1">{rental.procedure}</p>
          )}
          <p className="text-[11px] text-gray-400 mt-1.5">
            {fmtDisplayShort(rental.rentalStart)} – {fmtDisplayShort(rental.rentalEnd)}
          </p>
        </div>
        <ArrowRight size={15} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-1 transition-colors" />
      </div>
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function StatCard({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className={`inline-flex p-2 rounded-lg ${bg} mb-2`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function Section({ title, count, empty, children }: { title: string; count: number; empty?: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {count > 0 && (
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {count === 0 && empty ? (
        <p className="text-sm text-gray-400 text-center py-8 bg-white rounded-2xl border border-gray-100">{empty}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}
