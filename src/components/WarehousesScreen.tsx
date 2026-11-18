import React, { useState } from 'react';
import { ArrowLeftRight, Building2, MapPin, Plus, UserCheck, X } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { computeWarehouseStats, formatCurrency } from '../utils/ledgerEngine';
import { WarehouseStatusBadge } from './StatusBadge';

interface WarehousesScreenProps {
  onInitiateTransfer: () => void;
}

export function WarehousesScreen({ onInitiateTransfer }: WarehousesScreenProps) {
  const { warehouses, skus, settings, createWarehouse } = useLedger();
  const [modalOpen, setModalOpen] = useState(false);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [address, setAddress] = useState('');
  const [capacityUnits, setCapacityUnits] = useState('');
  const [managerName, setManagerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await createWarehouse({
      code,
      name,
      region,
      address,
      capacityUnits: Number(capacityUnits),
      managerName,
    });
    if (!res.ok) {
      setError(res.error || 'Unable to register hub.');
      return;
    }
    setCode('');
    setName('');
    setRegion('');
    setAddress('');
    setCapacityUnits('');
    setManagerName('');
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-[32px] font-semibold tracking-tight text-[#17211E]">
            Warehouse Network
          </h1>
          <p className="text-sm text-[#7C8982] mt-1">
            Regional distribution hubs, bin capacity utilization, and inter-hub stock transfers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onInitiateTransfer}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#E2E8E4] bg-white hover:bg-[#F5F7F3] text-xs font-semibold text-[#17211E] transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Hub Transfer</span>
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#14211D] hover:bg-[#23332D] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Hub</span>
          </button>
        </div>
      </div>

      {/* Hub Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {warehouses.map((hub) => {
          const stats = computeWarehouseStats(hub, skus);
          const isHighLoad = stats.utilizationPct >= 80 || hub.status === 'congested';

          return (
            <div key={hub.id} className="card-surface p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#14211D] text-[#C7E78B] flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#7C8982]">{hub.code}</span>
                      <span className="text-xs text-[#7C8982]" aria-hidden="true">·</span>
                      <span className="text-xs font-medium text-[#434846]">{hub.region}</span>
                    </div>
                    <h2 className="font-display text-lg font-semibold text-[#17211E] truncate">
                      {hub.name}
                    </h2>
                  </div>
                </div>
                <WarehouseStatusBadge status={hub.status} />
              </div>

              <div className="grid grid-cols-3 gap-3 py-3 border-y border-[#E2E8E4]">
                <div>
                  <p className="text-[11px] font-display font-bold uppercase tracking-wider text-[#7C8982]">
                    Active SKUs
                  </p>
                  <p className="font-display text-xl font-bold text-[#17211E] tabular-nums-lining mt-0.5">
                    {stats.skuCount}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-display font-bold uppercase tracking-wider text-[#7C8982]">
                    Stored Units
                  </p>
                  <p className="font-display text-xl font-bold text-[#17211E] tabular-nums-lining mt-0.5">
                    {stats.storedUnits.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-display font-bold uppercase tracking-wider text-[#7C8982]">
                    Hub Valuation
                  </p>
                  <p className="font-display text-xl font-bold text-[#17211E] tabular-nums-lining mt-0.5">
                    {formatCurrency(stats.valuation, settings.currency)}
                  </p>
                </div>
              </div>

              {/* Capacity Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#434846]">Rack Capacity Utilization</span>
                  <span className="font-mono font-semibold text-[#17211E] tabular-nums-lining">
                    {stats.utilizationPct}% ({stats.storedUnits.toLocaleString()} /{' '}
                    {hub.capacityUnits.toLocaleString()})
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#E2E8E4] overflow-hidden">
                  <div
                    style={{ width: `${stats.utilizationPct}%` }}
                    className={`h-full rounded-full ${
                      isHighLoad ? 'bg-[#E9A18D]' : 'bg-[#C7E78B]'
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#7C8982]">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {hub.address}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#17211E] font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-[#7C8982]" />
                  {hub.managerName}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Warehouse Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#14211D]/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wh-modal-title"
        >
          <div className="modal-surface rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8E4]">
              <h2 id="wh-modal-title" className="font-display text-lg font-semibold text-[#17211E]">
                Register Distribution Hub
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close warehouse modal"
                className="w-9 h-9 rounded-lg border border-[#E2E8E4] flex items-center justify-center text-[#434846] hover:bg-[#F5F7F3] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-[#E9A18D]/25 border border-[#E9A18D] text-xs font-medium text-[#732B1A]">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="wh-code" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Hub Code *
                  </label>
                  <input
                    id="wh-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="FRA-EU02"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono uppercase focus:border-[#14211D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="wh-region" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Region *
                  </label>
                  <input
                    id="wh-region"
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Central Europe"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm focus:border-[#14211D] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="wh-name" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                  Facility Name *
                </label>
                <input
                  id="wh-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Frankfurt Cargo Terminal"
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm focus:border-[#14211D] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="wh-address" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                  Street Address *
                </label>
                <input
                  id="wh-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Cargo City South 550, 60549 Frankfurt"
                  className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm focus:border-[#14211D] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="wh-cap" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Capacity (Units) *
                  </label>
                  <input
                    id="wh-cap"
                    type="number"
                    min={100}
                    value={capacityUnits}
                    onChange={(e) => setCapacityUnits(e.target.value)}
                    placeholder="4000"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono tabular-nums-lining focus:border-[#14211D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="wh-mgr" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                    Facility Lead *
                  </label>
                  <input
                    id="wh-mgr"
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="Lukas Weber"
                    className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm focus:border-[#14211D] focus:outline-none"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-[#E2E8E4] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-10 px-4 rounded-lg border border-[#E2E8E4] text-sm font-semibold text-[#17211E] hover:bg-[#F5F7F3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-lg bg-[#C7E78B] hover:bg-[#B8DC7A] text-[#14211D] text-sm font-bold cursor-pointer"
                >
                  Register Hub
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
