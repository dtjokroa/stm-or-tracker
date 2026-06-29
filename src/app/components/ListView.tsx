"use client";

import { useState, useMemo } from "react";
import { Search, Calendar, Building2, User, ChevronDown, ChevronUp, Trash2, Pencil } from "lucide-react";
import type { Companion, Rental } from "@/app/lib/data";
import {
  fmtDisplay,
  fmtDisplayShort,
  getPrincipalById,
  getStatusMeta,
  isRentalActive,
  isRentalToday,
  isRentalUpcoming,
  RENTAL_STATUSES,
  todayStr,
} from "@/app/lib/data";

type FilterTab = "all" | "today" | "active" | "upcoming" | "completed";

interface Props {
  rentals: Rental[];
  companions: Companion[];
  onEdit: (rental: Rental) => void;
  onDelete: (rentalId: string) => void;
}

export default function ListView({ rentals, companions, onEdit, onDelete }: Props) {
  const [tab, setTab] = useState<FilterTab>("active");
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = todayStr();

  const filtered = useMemo(() => {
    let list = [...rentals];

    if (tab === "today") list = list.filter((r) => isRentalToday(r));
    else if (tab === "active") list = list.filter((r) => isRentalActive(r));
    else if (tab === "upcoming") list = list.filter((r) => isRentalUpcoming(r));
    else if (tab === "completed") list = list.filter((r) => r.status === "completed");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.unitLabel.toLowerCase().includes(q) ||
          r.hospitalName.toLowerCase().includes(q) ||
          r.companionName.toLowerCase().includes(q) ||
          r.surgeonName.toLowerCase().includes(q) ||
          r.procedure.toLowerCase().includes(q) ||
          r.notes.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const cmp = a.rentalStart.localeCompare(b.rentalStart);
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [rentals, tab, search, sortAsc]);

  const counts = useMemo(() => ({
    all: rentals.length,
    today: rentals.filter((r) => isRentalToday(r)).length,
    active: rentals.filter((r) => isRentalActive(r)).length,
    upcoming: rentals.filter((r) => isRentalUpcoming(r)).length,
    completed: rentals.filter((r) => r.status === "completed").length,
  }), [rentals]);

  const TABS: { id: FilterTab; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "active", label: "Active" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
    { id: "all", label: "All" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              tab === t.id
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {t.label}
            {counts[t.id] > 0 && (
              <span
                className={`ml-1.5 text-[10px] ${
                  tab === t.id ? "text-gray-300" : "text-gray-400"
                }`}
              >
                {counts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search unit, hospital, companion..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setSortAsc((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-gray-400 transition-colors"
        >
          {sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Date
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">No rentals found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <RentalListItem
              key={r.id}
              rental={r}
              principal={getPrincipalById(r.principalId)}
              expanded={expandedId === r.id}
              onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
              onEdit={() => onEdit(r)}
              onDelete={() => onDelete(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RentalListItem({
  rental,
  principal,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  rental: Rental;
  principal?: { color: string };
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusMeta = getStatusMeta(rental.status);
  const today = todayStr();
  const isActive = rental.status !== "cancelled" &&
    rental.rentalStart <= today && rental.rentalEnd >= today;

  return (
    <div
      className={`bg-white rounded-xl border transition-all overflow-hidden ${
        isActive ? "border-green-200 shadow-sm shadow-green-50" : "border-gray-100"
      }`}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        {/* Color bar */}
        <div
          className="w-1 h-10 rounded-full flex-shrink-0"
          style={{ backgroundColor: principal?.color ?? "#6b7280" }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">{rental.unitLabel}</span>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white flex-shrink-0"
              style={{ backgroundColor: statusMeta.color }}
            >
              {statusMeta.label}
            </span>
            {isActive && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">
                In Use
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 size={11} />
              {rental.hospitalName}
            </span>
            <span className="flex items-center gap-1">
              <User size={11} />
              <strong className="text-gray-700">{rental.companionName}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {fmtDisplayShort(rental.rentalStart)} – {fmtDisplayShort(rental.rentalEnd)}
            </span>
          </div>
        </div>

        <ChevronDown
          size={16}
          className={`text-gray-400 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 text-xs">
            {rental.department && (
              <Detail label="Department" value={rental.department} />
            )}
            {rental.surgeonName && (
              <Detail label="Surgeon" value={rental.surgeonName} />
            )}
            {rental.procedure && (
              <Detail label="Procedure" value={rental.procedure} />
            )}
            <Detail label="Serial" value={rental.serial} />
            <Detail label="Start" value={fmtDisplay(rental.rentalStart)} />
            <Detail label="End" value={fmtDisplay(rental.rentalEnd)} />
          </div>
          {rental.notes && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">{rental.notes}</p>
            </div>
          )}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Pencil size={12} />
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Delete this rental?")) onDelete();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-gray-400 uppercase tracking-wide text-[10px]">{label}</span>
      <div className="text-gray-800 font-medium mt-0.5">{value}</div>
    </div>
  );
}
