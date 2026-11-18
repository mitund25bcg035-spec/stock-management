import React, { useEffect, useState } from 'react';
import { Cloud, Download, LogIn, LogOut, RotateCcw, Save } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import type { CurrencyCode } from '../types/ledger';

export function SettingsScreen() {
  const {
    user,
    settings,
    warehouses,
    authError,
    signInWithGoogle,
    signOutUser,
    updateSettings,
    resetWorkspaceToSeed,
    exportSkusCsv,
  } = useLedger();

  const [organizationName, setOrganizationName] = useState(settings.organizationName);
  const [operatorName, setOperatorName] = useState(settings.operatorName);
  const [currency, setCurrency] = useState<CurrencyCode>(settings.currency);
  const [lowStockMultiplier, setLowStockMultiplier] = useState(
    String(settings.lowStockMultiplier)
  );
  const [defaultWarehouseId, setDefaultWarehouseId] = useState(settings.defaultWarehouseId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOrganizationName(settings.organizationName);
    setOperatorName(settings.operatorName);
    setCurrency(settings.currency);
    setLowStockMultiplier(String(settings.lowStockMultiplier));
    setDefaultWarehouseId(settings.defaultWarehouseId);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        organizationName: organizationName.trim() || 'Kinetic Industrial Logistics',
        operatorName: operatorName.trim() || 'Operations Director',
        currency,
        lowStockMultiplier: Number(lowStockMultiplier) || 1.0,
        defaultWarehouseId,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl sm:text-[32px] font-semibold tracking-tight text-[#17211E]">
          Workspace &amp; Cloud Sync
        </h1>
        <p className="text-sm text-[#7C8982] mt-1">
          Configure ledger currency, reorder alert sensitivity, and Firebase Cloud persistence.
        </p>
      </div>

      {/* Cloud Sync & Authentication Card */}
      <div className="card-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#14211D] text-[#C7E78B] flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-[#17211E]">
              {user ? 'Firebase Cloud Sync Active' : 'Cloud Persistence Available'}
            </h2>
            <p className="text-xs text-[#434846] mt-0.5 max-w-md">
              {user
                ? `Signed in as ${user.email}. All SKUs, warehouses, orders, suppliers, and movements sync in real time to your isolated cloud ledger.`
                : 'Currently running in browser-local mode. Sign in with Google to persist and sync your ledger across devices in Firebase Firestore.'}
            </p>
            {authError && (
              <p className="text-xs text-[#BA1A1A] mt-1.5 font-medium">{authError}</p>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() => void signOutUser()}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-[#E2E8E4] text-sm font-semibold text-[#17211E] hover:bg-[#F5F7F3] cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#C7E78B] hover:bg-[#B8DC7A] text-[#14211D] text-sm font-bold cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Operational Preferences Form */}
      <form onSubmit={handleSave} className="card-surface p-6 space-y-5">
        <h2 className="font-display text-lg font-semibold text-[#17211E]">
          Ledger Configuration
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="set-org" className="block text-xs font-semibold text-[#17211E] mb-1.5">
              Organization Name
            </label>
            <input
              id="set-org"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm focus:border-[#14211D] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="set-op" className="block text-xs font-semibold text-[#17211E] mb-1.5">
              Lead Operator Name
            </label>
            <input
              id="set-op"
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm focus:border-[#14211D] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="set-curr" className="block text-xs font-semibold text-[#17211E] mb-1.5">
              Reporting Currency
            </label>
            <select
              id="set-curr"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] bg-white text-sm focus:border-[#14211D] focus:outline-none"
            >
              <option value="USD">USD ($) — US Dollar</option>
              <option value="EUR">EUR (€) — Euro</option>
              <option value="GBP">GBP (£) — British Pound</option>
            </select>
          </div>

          <div>
            <label htmlFor="set-mult" className="block text-xs font-semibold text-[#17211E] mb-1.5">
              Low-Stock Safety Multiplier
            </label>
            <select
              id="set-mult"
              value={lowStockMultiplier}
              onChange={(e) => setLowStockMultiplier(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] bg-white text-sm focus:border-[#14211D] focus:outline-none"
            >
              <option value="1">1.0x (Standard Reorder Point)</option>
              <option value="1.25">1.25x (+25% Buffer Warning)</option>
              <option value="1.5">1.5x (+50% Peak Season Buffer)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="set-wh" className="block text-xs font-semibold text-[#17211E] mb-1.5">
              Default Receiving Warehouse
            </label>
            <select
              id="set-wh"
              value={defaultWarehouseId}
              onChange={(e) => setDefaultWarehouseId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] bg-white text-sm focus:border-[#14211D] focus:outline-none"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E2E8E4] flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#14211D] hover:bg-[#23332D] text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </div>
      </form>

      {/* Data Tools */}
      <div className="card-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-[#17211E]">
            Ledger Export &amp; Baseline Reset
          </h2>
          <p className="text-xs text-[#7C8982] mt-0.5">
            Download a full CSV snapshot of your SKUs or restore the sample industrial dataset.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => exportSkusCsv()}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#E2E8E4] bg-white hover:bg-[#F5F7F3] text-xs font-semibold text-[#17211E] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Catalog CSV</span>
          </button>
          <button
            type="button"
            onClick={() => void resetWorkspaceToSeed()}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[#E9A18D] text-xs font-semibold text-[#732B1A] hover:bg-[#E9A18D]/20 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Baseline Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
