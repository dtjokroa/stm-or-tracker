"use client";

import { useState } from "react";
import { X, Calendar, Building2, User, Stethoscope, ChevronDown } from "lucide-react";
import type { Companion, Rental, UnitsByPrincipal } from "@/app/lib/data";
import {
  PRINCIPAL_ID,
  RENTAL_STATUSES,
  fmt,
  uid,
} from "@/app/lib/data";

interface Props {
  rental?: Rental | null;
  unitsByPrincipal: UnitsByPrincipal;
  companions: Companion[];
  onSave: (rental: Rental) => void;
  onClose: () => void;
}

const today = () => fmt(new Date());

export default function RentalModal({ rental, unitsByPrincipal, companions, onSave, onClose }: Props) {
  const isEdit = Boolean(rental);

  const principalId = PRINCIPAL_ID;
  const [unitId, setUnitId] = useState(rental?.unitId ?? "");
  const [hospitalName, setHospitalName] = useState(rental?.hospitalName ?? "");
  const [department, setDepartment] = useState(rental?.department ?? "OR");
  const [surgeonName, setSurgeonName] = useState(rental?.surgeonName ?? "");
  const [procedure, setProcedure] = useState(rental?.procedure ?? "");
  const [rentalStart, setRentalStart] = useState(rental?.rentalStart ?? today());
  const [rentalEnd, setRentalEnd] = useState(rental?.rentalEnd ?? today());
  const [status, setStatus] = useState(rental?.status ?? "scheduled");
  const [companionId, setCompanionId] = useState(rental?.companionId ?? companions[0]?.id ?? "");
  const [notes, setNotes] = useState(rental?.notes ?? "");

  const filteredUnits = unitsByPrincipal[principalId] ?? [];

  const canSave =
    principalId && unitId && hospitalName.trim() && rentalStart && rentalEnd && companionId;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    const unit = filteredUnits.find((u) => u.id === unitId)!;
    const companion = companions.find((c) => c.id === companionId)!;
    const now = new Date().toISOString();

    onSave({
      id: rental?.id ?? uid(),
      principalId,
      unitId: unit.id,
      unitLabel: unit.label,
      serial: unit.serial,
      hospitalName: hospitalName.trim(),
      department: department.trim() || "OR",
      surgeonName: surgeonName.trim(),
      procedure: procedure.trim(),
      rentalStart,
      rentalEnd: rentalEnd < rentalStart ? rentalStart : rentalEnd,
      status: status as Rental["status"],
      companionId: companion.id,
      companionName: companion.name,
      notes: notes.trim(),
      createdAt: rental?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
          style={{ borderTopLeftRadius: "1rem", borderTopRightRadius: "1rem" }}
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? "Edit Rental" : "New Rental"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Track a unit in the OR</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Unit */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              Unit
            </label>
            <div className="relative">
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                disabled={filteredUnits.length === 0}
              >
                {filteredUnits.length === 0 ? (
                  <option value="">No units — add them in Settings</option>
                ) : (
                  filteredUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Hospital + Department */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Hospital *
              </label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="Hospital name"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. OR, ICU"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Surgeon + Procedure */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Surgeon
              </label>
              <div className="relative">
                <Stethoscope size={15} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={surgeonName}
                  onChange={(e) => setSurgeonName(e.target.value)}
                  placeholder="Dr. ..."
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Procedure
              </label>
              <input
                type="text"
                value={procedure}
                onChange={(e) => setProcedure(e.target.value)}
                placeholder="e.g. Craniotomy"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                Start Date *
              </label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="date"
                  value={rentalStart}
                  onChange={(e) => setRentalStart(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                End Date *
              </label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="date"
                  value={rentalEnd}
                  min={rentalStart}
                  onChange={(e) => setRentalEnd(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Companion */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              Accompanying Person (PIC) *
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-3 text-gray-400" />
              <select
                value={companionId}
                onChange={(e) => setCompanionId(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                required
              >
                {companions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.role}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              Status
            </label>
            <div className="flex gap-2 flex-wrap">
              {RENTAL_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    status === s.value
                      ? "text-white border-transparent"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                  style={status === s.value ? { backgroundColor: s.color, borderColor: s.color } : {}}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isEdit ? "Save Changes" : "Add Rental"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
