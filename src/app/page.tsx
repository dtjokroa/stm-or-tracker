"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  List,
  Plus,
  Settings,
  Wifi,
  WifiOff,
  Loader2,
  Activity,
} from "lucide-react";
import type { Companion, Rental, UnitsByPrincipal } from "@/app/lib/data";
import { DEFAULT_UNITS, DEFAULT_COMPANIONS, todayStr } from "@/app/lib/data";
import type { AppState, LoadResult, StorageStatus } from "@/app/lib/persistence";
import { loadInitialState, persistState } from "@/app/lib/persistence";
import Dashboard from "@/app/components/Dashboard";
import CalendarView from "@/app/components/CalendarView";
import ListView from "@/app/components/ListView";
import RentalModal from "@/app/components/RentalModal";
import StaffManager from "@/app/components/StaffManager";

type View = "dashboard" | "calendar" | "list";

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [companions, setCompanions] = useState<Companion[]>(DEFAULT_COMPANIONS);
  const [unitsByPrincipal, setUnitsByPrincipal] = useState<UnitsByPrincipal>(DEFAULT_UNITS);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("local");
  const [persistEnabled, setPersistEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  const [showRentalModal, setShowRentalModal] = useState(false);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);
  const [showStaffManager, setShowStaffManager] = useState(false);

  // Load initial state
  useEffect(() => {
    loadInitialState().then((result: LoadResult) => {
      setRentals(result.state.rentals);
      setCompanions(result.state.companions);
      setUnitsByPrincipal(result.state.unitsByPrincipal);
      setStorageStatus(result.storageStatus);
      setPersistEnabled(result.persistEnabled);
      setLoading(false);
    });
  }, []);

  // Persist on state change (debounced)
  const save = useCallback(
    async (state: AppState) => {
      const status = await persistState(state, { persistEnabled });
      setStorageStatus(status);
    },
    [persistEnabled]
  );

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(
      () => save({ rentals, companions, unitsByPrincipal }),
      400
    );
    return () => clearTimeout(t);
  }, [rentals, companions, unitsByPrincipal, loading, save]);

  function openAddRental(date?: string) {
    setEditingRental(null);
    setDefaultDate(date);
    setShowRentalModal(true);
  }

  function openEditRental(rental: Rental) {
    setEditingRental(rental);
    setDefaultDate(undefined);
    setShowRentalModal(true);
  }

  function handleSaveRental(rental: Rental) {
    setRentals((prev) => {
      const idx = prev.findIndex((r) => r.id === rental.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = rental;
        return next;
      }
      return [rental, ...prev];
    });
    setShowRentalModal(false);
  }

  function handleDeleteRental(rentalId: string) {
    setRentals((prev) => prev.filter((r) => r.id !== rentalId));
  }

  const NAV: { id: View; icon: React.ReactNode; label: string }[] = [
    { id: "dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { id: "calendar", icon: <CalendarDays size={18} />, label: "Calendar" },
    { id: "list", icon: <List size={18} />, label: "Rentals" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 size={28} className="animate-spin text-blue-500" />
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Activity size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900 hidden sm:block">IOM Tracker</span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1 flex-1">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  view === n.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {n.icon}
                <span className="hidden sm:block">{n.label}</span>
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Storage indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              {storageStatus === "supabase" ? (
                <Wifi size={13} className="text-green-500" />
              ) : storageStatus === "local" ? (
                <Wifi size={13} className="text-gray-400" />
              ) : (
                <WifiOff size={13} className="text-amber-500" />
              )}
              <span
                className={
                  storageStatus === "supabase"
                    ? "text-green-600"
                    : storageStatus === "local"
                    ? "text-gray-400"
                    : "text-amber-500"
                }
              >
                {storageStatus === "supabase"
                  ? "Synced"
                  : storageStatus === "local"
                  ? "Local"
                  : "Offline"}
              </span>
            </div>

            <button
              onClick={() => setShowStaffManager(true)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Manage staff & units"
            >
              <Settings size={18} />
            </button>

            <button
              onClick={() => openAddRental(todayStr())}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus size={16} />
              <span className="hidden sm:block">New Rental</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {view === "dashboard" && (
          <Dashboard
            rentals={rentals}
            companions={companions}
            onEditRental={openEditRental}
          />
        )}

        {view === "calendar" && (
          <CalendarView
            rentals={rentals}
            onAddRental={openAddRental}
            onEditRental={openEditRental}
          />
        )}

        {view === "list" && (
          <ListView
            rentals={rentals}
            companions={companions}
            onEdit={openEditRental}
            onDelete={handleDeleteRental}
          />
        )}
      </main>

      {/* Rental modal */}
      {showRentalModal && (
        <RentalModal
          rental={editingRental}
          unitsByPrincipal={unitsByPrincipal}
          companions={companions}
          onSave={handleSaveRental}
          onClose={() => setShowRentalModal(false)}
        />
      )}

      {/* Staff & unit manager */}
      {showStaffManager && (
        <StaffManager
          companions={companions}
          unitsByPrincipal={unitsByPrincipal}
          onUpdateCompanions={setCompanions}
          onUpdateUnits={setUnitsByPrincipal}
          onClose={() => setShowStaffManager(false)}
        />
      )}
    </div>
  );
}
