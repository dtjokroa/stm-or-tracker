"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Package, UserCheck, User, Stethoscope } from "lucide-react";
import type { Rental } from "@/app/lib/data";
import {
  fmtDisplay,
  fmtDisplayShort,
  getDaysInMonth,
  getFirstDayOfMonth,
  getPrincipalById,
  getStatusMeta,
  isInRange,
} from "@/app/lib/data";

interface Props {
  rentals: Rental[];
  onAddRental: (date?: string) => void;
  onEditRental: (rental: Rental) => void;
}

export default function CalendarView({
  rentals,
  onAddRental,
  onEditRental,
}: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Prev / next month helpers
  const prevMonthYear = month === 0 ? year - 1 : year;
  const prevMonthIdx  = month === 0 ? 11 : month - 1;
  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonthIdx  = month === 11 ? 0 : month + 1;
  const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonthIdx);

  // Trailing cells needed to complete the last row
  const totalCells = firstDay + daysInMonth;
  const trailingCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

  function pad2(n: number) { return String(n).padStart(2, "0"); }

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  function getRentalsForDay(dateStr: string): Rental[] {
    return rentals.filter(
      (r) => r.status !== "cancelled" && isInRange(dateStr, r.rentalStart, r.rentalEnd)
    );
  }

  function dayStr(day: number): string {
    return `${year}-${pad2(month + 1)}-${pad2(day)}`;
  }

  function overflowDayStr(y: number, m: number, d: number): string {
    return `${y}-${pad2(m + 1)}-${pad2(d)}`;
  }

  const selectedRentals = selectedDay ? getRentalsForDay(selectedDay) : [];

  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div className="flex flex-col gap-4">
      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <h2 className="text-base font-semibold text-gray-900">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {/* Trailing days from previous month */}
          {Array.from({ length: firstDay }).map((_, i) => {
            const day = daysInPrevMonth - firstDay + 1 + i;
            const ds = overflowDayStr(prevMonthYear, prevMonthIdx, day);
            const overflowRentals = getRentalsForDay(ds);
            return (
              <OverflowCell
                key={`prev-${i}`}
                day={day}
                colIdx={i}
                rentals={overflowRentals}
                onEdit={onEditRental}
              />
            );
          })}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const ds = dayStr(day);
            const dayRentals = getRentalsForDay(ds);
            const isToday = ds === todayStr;
            const isSelected = ds === selectedDay;
            const colIdx = (firstDay + i) % 7;

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : ds)}
                className={`h-24 border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50 flex flex-col ${
                  colIdx < 6 ? "border-r border-gray-200" : ""
                } ${isSelected ? "bg-blue-50 hover:bg-blue-50" : ""}`}
              >
                {/* Day number row */}
                <div className="flex items-center justify-between px-1.5 pt-1.5 mb-0.5">
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? "bg-blue-600 text-white"
                        : isSelected
                        ? "text-blue-600 font-semibold"
                        : "text-gray-700"
                    }`}
                  >
                    {day}
                  </span>
                  {dayRentals.length === 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddRental(ds); }}
                      className="opacity-0 hover:opacity-100 p-0.5 rounded text-gray-300 hover:text-blue-500 transition-opacity"
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>

                {/* Spanning event bars */}
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {dayRentals.slice(0, 3).map((r) => {
                    const isStart = r.rentalStart === ds;
                    const isEnd = r.rentalEnd === ds;
                    const color = r.caseType === "rep-only" ? "bg-teal-500" : "bg-blue-500";
                    return (
                      <button
                        key={r.id}
                        onClick={(e) => { e.stopPropagation(); onEditRental(r); }}
                        title={`${r.caseType === "rep-only" ? (r.equipmentNote || "Rep Only") : r.unitLabel} @ ${r.hospitalName}${r.representativeName ? " — " + r.representativeName : ""}`}
                        className={`text-left text-[10px] font-medium py-0.5 text-white leading-tight overflow-hidden whitespace-nowrap ${color} ${
                          isStart ? "ml-1.5 rounded-l-sm pl-1.5" : "pl-1"
                        } ${
                          isEnd ? "mr-1.5 rounded-r-sm pr-1.5" : "pr-0"
                        }`}
                      >
                        {isStart ? (r.representativeName || r.hospitalName) : "\u00a0"}
                      </button>
                    );
                  })}
                  {dayRentals.length > 3 && (
                    <span className="text-[10px] text-gray-400 px-1.5">+{dayRentals.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Leading days from next month */}
          {Array.from({ length: trailingCount }).map((_, i) => {
            const day = i + 1;
            const ds = overflowDayStr(nextMonthYear, nextMonthIdx, day);
            const overflowRentals = getRentalsForDay(ds);
            const colIdx = (totalCells + i) % 7;
            return (
              <OverflowCell
                key={`next-${i}`}
                day={day}
                colIdx={colIdx}
                rentals={overflowRentals}
                onEdit={onEditRental}
              />
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{fmtDisplay(selectedDay)}</h3>
            <button
              onClick={() => onAddRental(selectedDay)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus size={13} />
              Add
            </button>
          </div>

          {selectedRentals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No cases on this day.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedRentals.map((r) => (
                <RentalCard
                  key={r.id}
                  rental={r}
                  principal={getPrincipalById(r.principalId)}
                  onClick={() => onEditRental(r)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OverflowCell({
  day,
  colIdx,
  rentals,
  onEdit,
}: {
  day: number;
  colIdx: number;
  rentals: Rental[];
  onEdit: (r: Rental) => void;
}) {
  return (
    <div
      className={`h-24 border-b border-gray-200 flex flex-col bg-gray-50/60 ${
        colIdx < 6 ? "border-r border-gray-200" : ""
      }`}
    >
      <div className="px-1.5 pt-1.5 mb-0.5">
        <span className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full text-gray-300">
          {day}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {rentals.slice(0, 3).map((r) => (
          <button
            key={r.id}
            onClick={() => onEdit(r)}
            className={`text-left text-[10px] font-medium py-0.5 leading-tight overflow-hidden whitespace-nowrap opacity-50 mx-1.5 rounded-sm px-1.5 ${
              r.caseType === "rep-only" ? "bg-teal-400 text-white" : "bg-blue-400 text-white"
            }`}
          >
            {r.representativeName || r.hospitalName}
          </button>
        ))}
      </div>
    </div>
  );
}

function RentalCard({
  rental,
  principal,
  onClick,
}: {
  rental: Rental;
  principal?: { color: string };
  onClick: () => void;
}) {
  const statusMeta = getStatusMeta(rental.status);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-colors border border-gray-100"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ backgroundColor: principal?.color ?? "#6b7280" }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {rental.caseType === "rep-only"
              ? <UserCheck size={13} className="text-teal-500 flex-shrink-0" />
              : <Package size={13} className="text-blue-500 flex-shrink-0" />}
            <span className="text-sm font-semibold text-gray-900 truncate">
              {rental.caseType === "rep-only"
                ? (rental.equipmentNote || "Client's Equipment")
                : rental.unitLabel}
            </span>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white flex-shrink-0"
              style={{ backgroundColor: statusMeta.color }}
            >
              {statusMeta.label}
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${rental.caseType === "rep-only" ? "bg-teal-50 text-teal-600" : "bg-blue-50 text-blue-600"}`}>
              {rental.caseType === "rep-only" ? "Rep Only" : "Rental"}
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-1">
            <span className="font-medium">{rental.hospitalName}</span>
            {rental.department && ` · ${rental.department}`}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            {rental.representativeName && (
              <span className="flex items-center gap-1">
                <User size={11} /><strong className="text-gray-700">{rental.representativeName}</strong>
              </span>
            )}
            {rental.surgeonName && (
              <span className="flex items-center gap-1">
                <Stethoscope size={11} />{rental.surgeonName}
              </span>
            )}
            {rental.procedure && <span className="text-gray-400">{rental.procedure}</span>}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {fmtDisplayShort(rental.rentalStart)} – {fmtDisplayShort(rental.rentalEnd)}
          </p>
        </div>
      </div>
    </button>
  );
}
