"use client";

import { useMemo } from "react";
import { Activity, Clock, CheckCircle, AlertCircle, User, Building2, ArrowRight } from "lucide-react";
import type { Representative, Rental } from "@/app/lib/data";
import {
  fmtDisplay,
  fmtDisplayShort,
  getPrincipalById,
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

  const todayRentals = useMemo(
    () => rentals.filter((r) => isRentalToday(r)),
    [rentals]
  );

  const upcomingRentals = useMemo(
    () =>
      rentals
        .filter((r) => isRentalUpcoming(r))
        .sort((a, b) => a.rentalStart.localeCompare(b.rentalStart))
        .slice(0, 5),
    [rentals]
  );

  const activeCount = rentals.filter((r) => isRentalActive(r)).length;
  const scheduledCount = rentals.filter((r) => r.status === "scheduled").length;
  const completedCount = rentals.filter((r) => r.status === "completed").length;

  // Representative utilization: who has active rentals today
  const activeRepresentatives = useMemo(() => {
    const representativeIds = new Set(todayRentals.map((r) => r.representativeId));
    return representatives.filter((c) => representativeIds.has(c.id));
  }, [todayRentals, representatives]);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Activity size={18} className="text-green-600" />}
          bg="bg-green-50"
          label="Active Now"
          value={activeCount}
        />
        <StatCard
          icon={<Clock size={18} className="text-amber-600" />}
          bg="bg-amber-50"
          label="Scheduled"
          value={scheduledCount}
        />
        <StatCard
          icon={<CheckCircle size={18} className="text-indigo-600" />}
          bg="bg-indigo-50"
          label="Completed"
          value={completedCount}
        />
        <StatCard
          icon={<User size={18} className="text-blue-600" />}
          bg="bg-blue-50"
          label="In Field Today"
          value={activeRepresentatives.length}
        />
      </div>

      {/* Today's rentals */}
      <Section
        title="Today in the OR"
        count={todayRentals.length}
        empty="No rentals today."
      >
        {todayRentals.map((r) => (
          <RentalCard
            key={r.id}
            rental={r}
            principal={getPrincipalById(r.principalId)}
            onClick={() => onEditRental(r)}
          />
        ))}
      </Section>

      {/* Active representatives */}
      {activeRepresentatives.length > 0 && (
        <Section title="Field Team Today" count={activeRepresentatives.length}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {activeRepresentatives.map((c) => {
              const their = todayRentals.filter((r) => r.representativeId === c.id);
              return (
                <div key={c.id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600">
                      {c.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-none">{c.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{c.role}</p>
                    </div>
                  </div>
                  {their.map((r) => (
                    <p key={r.id} className="text-xs text-gray-600 truncate">
                      {r.unitLabel.split(" (")[0]} @ {r.hospitalName}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Upcoming */}
      <Section title="Coming Up" count={upcomingRentals.length} empty="No upcoming rentals.">
        {upcomingRentals.map((r) => (
          <RentalCard
            key={r.id}
            rental={r}
            principal={getPrincipalById(r.principalId)}
            onClick={() => onEditRental(r)}
            compact
          />
        ))}
      </Section>
    </div>
  );
}

function StatCard({
  icon,
  bg,
  label,
  value,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className={`inline-flex p-2 rounded-lg ${bg} mb-2`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {count > 0 && (
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {count === 0 && empty ? (
        <p className="text-sm text-gray-400 text-center py-8 bg-white rounded-2xl border border-gray-100">
          {empty}
        </p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

function RentalCard({
  rental,
  principal,
  onClick,
  compact = false,
}: {
  rental: Rental;
  principal?: { color: string };
  onClick: () => void;
  compact?: boolean;
}) {
  const statusMeta = getStatusMeta(rental.status);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all p-4 group"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ backgroundColor: principal?.color ?? "#6b7280" }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">{rental.unitLabel}</span>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white flex-shrink-0"
              style={{ backgroundColor: statusMeta.color }}
            >
              {statusMeta.label}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 size={11} />
              {rental.hospitalName}
              {rental.department && ` · ${rental.department}`}
            </span>
            <span className="flex items-center gap-1">
              <User size={11} />
              <strong className="text-gray-700">{rental.representativeName}</strong>
            </span>
          </div>
          {!compact && rental.procedure && (
            <p className="text-xs text-gray-400 mt-1">📋 {rental.procedure}</p>
          )}
          <p className="text-[11px] text-gray-400 mt-1.5">
            {fmtDisplayShort(rental.rentalStart)} – {fmtDisplayShort(rental.rentalEnd)}
          </p>
        </div>
        <ArrowRight
          size={15}
          className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-1 transition-colors"
        />
      </div>
    </button>
  );
}
