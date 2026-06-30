"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, UserCheck, Pencil, X, Check, Download, Upload, Database } from "lucide-react";
import type { Representative, Rental, Unit, UnitsByPrincipal } from "@/app/lib/data";
import { REPRESENTATIVE_ROLES, PRINCIPAL_ID, PRINCIPALS, uid } from "@/app/lib/data";

interface Props {
  representatives: Representative[];
  unitsByPrincipal: UnitsByPrincipal;
  rentals: Rental[];
  onUpdateRepresentatives: (representatives: Representative[]) => void;
  onUpdateUnits: (units: UnitsByPrincipal) => void;
  onRestoreBackup: (rentals: Rental[], representatives: Representative[], unitsByPrincipal: UnitsByPrincipal) => void;
  onClose: () => void;
}

type Tab = "representatives" | "units" | "backup";

export default function StaffManager({
  representatives,
  unitsByPrincipal,
  rentals,
  onUpdateRepresentatives,
  onUpdateUnits,
  onRestoreBackup,
  onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>("representatives");

  const TAB_LABELS: { id: Tab; label: string }[] = [
    { id: "representatives", label: "Representatives" },
    { id: "units", label: "Units" },
    { id: "backup", label: "Backup" },
  ];

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
          {TAB_LABELS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                tab === id
                  ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {tab === "representatives" && (
            <RepresentativesTab representatives={representatives} onUpdate={onUpdateRepresentatives} />
          )}
          {tab === "units" && (
            <UnitsTab unitsByPrincipal={unitsByPrincipal} onUpdate={onUpdateUnits} />
          )}
          {tab === "backup" && (
            <BackupTab
              rentals={rentals}
              representatives={representatives}
              unitsByPrincipal={unitsByPrincipal}
              onRestore={onRestoreBackup}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Representatives Tab ───────────────────────────────────────────

function RepresentativesTab({
  representatives,
  onUpdate,
}: {
  representatives: Representative[];
  onUpdate: (representatives: Representative[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Representative["role"]>("Field Specialist");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Representative["role"]>("Field Specialist");

  function addRepresentative() {
    if (!newName.trim()) return;
    const representative: Representative = {
      id: uid(),
      name: newName.trim(),
      role: newRole,
    };
    onUpdate([...representatives, representative]);
    setNewName("");
    setNewRole("Field Specialist");
  }

  function removeRepresentative(id: string) {
    onUpdate(representatives.filter((c) => c.id !== id));
  }

  function startEdit(c: Representative) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditRole(c.role);
  }

  function saveEdit() {
    if (!editName.trim() || !editingId) return;
    onUpdate(representatives.map((c) => c.id === editingId ? { ...c, name: editName.trim(), role: editRole } : c));
    setEditingId(null);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 mb-4">
        Representatives who accompany rented units in the OR.
      </p>

      {/* Add new */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addRepresentative()}
          placeholder="Name"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value as Representative["role"])}
          className="px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {REPRESENTATIVE_ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button
          onClick={addRepresentative}
          disabled={!newName.trim()}
          className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {representatives.map((c) =>
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
                onChange={(e) => setEditRole(e.target.value as Representative["role"])}
                className="px-2 py-1.5 border border-blue-200 rounded text-sm focus:outline-none bg-white"
              >
                {REPRESENTATIVE_ROLES.map((r) => (
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
                  if (confirm(`Remove ${c.name}?`)) removeRepresentative(c.id);
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

// ── Backup Tab ────────────────────────────────────────────────────

interface BackupPayload {
  version: number;
  exportedAt: string;
  rentals: Rental[];
  representatives: Representative[];
  unitsByPrincipal: UnitsByPrincipal;
}

function BackupTab({
  rentals,
  representatives,
  unitsByPrincipal,
  onRestore,
}: {
  rentals: Rental[];
  representatives: Representative[];
  unitsByPrincipal: UnitsByPrincipal;
  onRestore: (rentals: Rental[], representatives: Representative[], unitsByPrincipal: UnitsByPrincipal) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const unitCount = Object.values(unitsByPrincipal).flat().length;

  function handleExport() {
    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      rentals,
      representatives,
      unitsByPrincipal,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iom-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result as string) as BackupPayload;
        if (
          !Array.isArray(payload.rentals) ||
          !Array.isArray(payload.representatives) ||
          typeof payload.unitsByPrincipal !== "object"
        ) {
          throw new Error("Invalid backup format.");
        }
        if (!confirm(`Restore ${payload.rentals.length} rentals, ${payload.representatives.length} representatives, and ${Object.values(payload.unitsByPrincipal).flat().length} units from backup dated ${payload.exportedAt?.slice(0, 10) ?? "unknown"}?\n\nThis will overwrite current data.`)) return;
        onRestore(payload.rentals, payload.representatives, payload.unitsByPrincipal);
        setRestoreMsg({ ok: true, text: "Backup restored successfully." });
      } catch (err) {
        setRestoreMsg({ ok: false, text: `Restore failed: ${err instanceof Error ? err.message : "Unknown error"}` });
      }
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Rentals", value: rentals.length },
          { label: "Representatives", value: representatives.length },
          { label: "Units", value: unitCount },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-lg px-3 py-3 text-center">
            <p className="text-lg font-semibold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Export */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Export</p>
        <p className="text-sm text-gray-500 mb-3">
          Download a full JSON backup of all rentals, representatives, and units. Store this file somewhere safe.
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Download size={15} />
          Download Backup
        </button>
      </div>

      {/* Import */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Restore</p>
        <p className="text-sm text-gray-500 mb-3">
          Restore data from a previously exported backup file. This will overwrite current data.
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Upload size={15} />
          Restore from File
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      </div>

      {restoreMsg && (
        <p className={`text-sm px-3 py-2 rounded-lg ${restoreMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {restoreMsg.text}
        </p>
      )}

      {/* DB note */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-start gap-2 text-xs text-gray-400">
          <Database size={12} className="mt-0.5 flex-shrink-0" />
          <p>Cloud data is stored in Supabase with daily automated backups. Point-in-Time Recovery is available on paid plans.</p>
        </div>
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
  const selectedPrincipal = PRINCIPAL_ID;
  const [newName, setNewName] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSerial, setEditSerial] = useState("");

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

  function startEdit(u: Unit) {
    setEditingId(u.id);
    setEditName(u.name);
    setEditSerial(u.serial);
  }

  function saveEdit() {
    if (!editName.trim() || !editSerial.trim() || !editingId) return;
    onUpdate({
      ...unitsByPrincipal,
      [selectedPrincipal]: currentUnits.map((u) =>
        u.id === editingId
          ? {
              id: editSerial.trim(),
              name: editName.trim(),
              serial: editSerial.trim(),
              label: `${editName.trim()} (${editSerial.trim()})`,
            }
          : u
      ),
    });
    setEditingId(null);
  }

  function removeUnit(unitId: string) {
    onUpdate({
      ...unitsByPrincipal,
      [selectedPrincipal]: currentUnits.filter((u) => u.id !== unitId),
    });
  }

  return (
    <div className="space-y-4">
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
          No units added yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {currentUnits.map((u) =>
            editingId === u.id ? (
              <div key={u.id} className="flex gap-2 items-center bg-blue-50 rounded-lg p-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Unit name"
                  className="flex-1 px-2 py-1.5 border border-blue-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <input
                  type="text"
                  value={editSerial}
                  onChange={(e) => setEditSerial(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                  placeholder="Serial"
                  className="w-24 px-2 py-1.5 border border-blue-200 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={saveEdit}
                  disabled={!editName.trim() || !editSerial.trim()}
                  className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                key={u.id}
                className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PRINCIPALS[0].color }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800">{u.name}</span>
                  <span className="text-xs text-gray-400 ml-2 font-mono">{u.serial}</span>
                </div>
                <button
                  onClick={() => startEdit(u)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${u.label}?`)) removeUnit(u.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
