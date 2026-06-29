"use client";

import { useState } from "react";
import { Plus, Trash2, UserCheck, Pencil, X, Check } from "lucide-react";
import type { Companion, Principal, Unit, UnitsByPrincipal } from "@/app/lib/data";
import { COMPANION_ROLES, PRINCIPALS, uid } from "@/app/lib/data";

interface Props {
  companions: Companion[];
  unitsByPrincipal: UnitsByPrincipal;
  onUpdateCompanions: (companions: Companion[]) => void;
  onUpdateUnits: (units: UnitsByPrincipal) => void;
  onClose: () => void;
}

type Tab = "companions" | "units";

export default function StaffManager({
  companions,
  unitsByPrincipal,
  onUpdateCompanions,
  onUpdateUnits,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>("companions");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Manage</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {(["companions", "units"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {tab === "companions" && (
            <CompanionsTab companions={companions} onUpdate={onUpdateCompanions} />
          )}
          {tab === "units" && (
            <UnitsTab unitsByPrincipal={unitsByPrincipal} onUpdate={onUpdateUnits} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Companions Tab ────────────────────────────────────────────────

function CompanionsTab({
  companions,
  onUpdate,
}: {
  companions: Companion[];
  onUpdate: (companions: Companion[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Companion["role"]>("Field Specialist");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Companion["role"]>("Field Specialist");

  function addCompanion() {
    if (!newName.trim()) return;
    const companion: Companion = {
      id: uid(),
      name: newName.trim(),
      role: newRole,
    };
    onUpdate([...companions, companion]);
    setNewName("");
    setNewRole("Field Specialist");
  }

  function removeCompanion(id: string) {
    onUpdate(companions.filter((c) => c.id !== id));
  }

  function startEdit(c: Companion) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditRole(c.role);
  }

  function saveEdit() {
    if (!editName.trim() || !editingId) return;
    onUpdate(companions.map((c) => c.id === editingId ? { ...c, name: editName.trim(), role: editRole } : c));
    setEditingId(null);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 mb-4">
        People who accompany rented units in the OR.
      </p>

      {/* Add new */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCompanion()}
          placeholder="Name"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value as Companion["role"])}
          className="px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {COMPANION_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button
          onClick={addCompanion}
          disabled={!newName.trim()}
          className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {companions.map((c) =>
          editingId === c.id ? (
            <div key={c.id} className="flex gap-2 items-center bg-blue-50 rounded-lg p-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-2 py-1.5 border border-blue-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as Companion["role"])}
                className="px-2 py-1.5 border border-blue-200 rounded text-sm focus:outline-none bg-white"
              >
                {COMPANION_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button onClick={saveEdit} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
                <Check size={14} />
              </button>
              <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div
              key={c.id}
              className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg"
            >
              <UserCheck size={15} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-800">{c.name}</span>
                <span className="text-xs text-gray-400 ml-2">{c.role}</span>
              </div>
              <button
                onClick={() => startEdit(c)}
                className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Remove ${c.name}?`)) removeCompanion(c.id);
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── Units Tab ─────────────────────────────────────────────────────

function UnitsTab({
  unitsByPrincipal,
  onUpdate,
}: {
  unitsByPrincipal: UnitsByPrincipal;
  onUpdate: (units: UnitsByPrincipal) => void;
}) {
  const [selectedPrincipal, setSelectedPrincipal] = useState(PRINCIPALS[0].id);
  const [newName, setNewName] = useState("");
  const [newSerial, setNewSerial] = useState("");

  const currentUnits = unitsByPrincipal[selectedPrincipal] ?? [];

  function addUnit() {
    if (!newName.trim() || !newSerial.trim()) return;
    const unit: Unit = {
      id: newSerial.trim(),
      name: newName.trim(),
      serial: newSerial.trim(),
      label: `${newName.trim()} (${newSerial.trim()})`,
    };
    onUpdate({
      ...unitsByPrincipal,
      [selectedPrincipal]: [...currentUnits, unit],
    });
    setNewName("");
    setNewSerial("");
  }

  function removeUnit(unitId: string) {
    onUpdate({
      ...unitsByPrincipal,
      [selectedPrincipal]: currentUnits.filter((u) => u.id !== unitId),
    });
  }

  return (
    <div className="space-y-4">
      {/* Principal tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {PRINCIPALS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPrincipal(p.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
              selectedPrincipal === p.id
                ? "text-white border-transparent"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
            style={selectedPrincipal === p.id ? { backgroundColor: p.color } : {}}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Add unit */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Unit name"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={newSerial}
          onChange={(e) => setNewSerial(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addUnit()}
          placeholder="Serial"
          className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addUnit}
          disabled={!newName.trim() || !newSerial.trim()}
          className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Unit list */}
      {currentUnits.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          No units for this principal.
        </p>
      ) : (
        <div className="space-y-1.5">
          {currentUnits.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg"
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor:
                    PRINCIPALS.find((p) => p.id === selectedPrincipal)?.color ?? "#6b7280",
                }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-800">{u.name}</span>
                <span className="text-xs text-gray-400 ml-2 font-mono">{u.serial}</span>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Remove ${u.label}?`)) removeUnit(u.id);
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
