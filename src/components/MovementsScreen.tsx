import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Search, SlidersHorizontal } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import type { MovementType } from '../types/ledger';

export function MovementsScreen() {
  const { movements, warehouses } = useLedger();
  const [typeFilter, setTypeFilter] = useState<'ALL' | MovementType>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return movements.filter((m) => {
      if (typeFilter !== 'ALL' && m.type !== typeFilter) return false;
      if (warehouseFilter !== 'ALL' && m.warehouseId !== warehouseFilter) return false;
      if (q) {
        const hay = `${m.referenceCode} ${m.skuCode} ${m.skuName} ${m.operatorName} ${m.notes || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [movements, typeFilter, warehouseFilter, query]);

  const summary = useMemo(() => {
    let inboundUnits = 0;
    let outboundUnits = 0;
    for (const m of filtered) {
      if (m.quantityDelta > 0) inboundUnits += m.quantityDelta;
      else outboundUnits += Math.abs(m.quantityDelta);
    }
    return { inboundUnits, outboundUnits, count: filtered.length };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-[32px] font-semibold tracking-tight text-[#17211E]">
            Stock Movements Ledger
          </h1>
          <p className="text-sm text-[#7C8982] mt-1">
            Append-only chronological audit trail of receipts, dispatches, hub transfers, and cycle counts.
          </p>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-surface p-5">
          <p className="font-display text-[11px] font-bold uppercase tracking-wider text-[#7C8982]">
            Matching Entries
          </p>
          <p className="font-display text-2xl font-bold text-[#17211E] tabular-nums-lining mt-1">
            {summary.count}
          </p>
        </div>
        <div className="card-surface p-5">
          <p className="font-display text-[11px] font-bold uppercase tracking-wider text-[#7C8982]">
            Inbound Volume
          </p>
          <p className="font-display text-2xl font-bold text-[#0E4331] tabular-nums-lining mt-1">
            +{summary.inboundUnits.toLocaleString()} u
          </p>
        </div>
        <div className="card-surface p-5">
          <p className="font-display text-[11px] font-bold uppercase tracking-wider text-[#7C8982]">
            Outbound &amp; Transfer Volume
          </p>
          <p className="font-display text-2xl font-bold text-[#732B1A] tabular-nums-lining mt-1">
            -{summary.outboundUnits.toLocaleString()} u
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card-surface p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[210px] sm:w-64">
            <Search className="w-4 h-4 text-[#7C8982] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ref, SKU, operator..."
              aria-label="Search movement ledger"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E2E8E4] text-sm focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
            />
          </div>

          <select
            aria-label="Filter movements by warehouse"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[#E2E8E4] bg-white text-xs font-semibold text-[#17211E] focus:border-[#14211D] focus:outline-none"
          >
            <option value="ALL">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex flex-wrap items-center p-1 rounded-lg bg-[#F5F7F3] border border-[#E2E8E4] self-start lg:self-auto">
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: 'inbound', label: 'Inbound' },
              { id: 'outbound', label: 'Outbound' },
              { id: 'transfer', label: 'Transfer' },
              { id: 'adjustment', label: 'Adjustment' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                typeFilter === tab.id
                  ? 'bg-white text-[#14211D] shadow-xs'
                  : 'text-[#7C8982] hover:text-[#17211E]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card-surface overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-display text-base font-semibold text-[#17211E]">
              No ledger movements match these filters
            </p>
            <p className="text-xs text-[#7C8982] mt-1">
              Clear your filters or log a new inbound/outbound transaction.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F7F3] border-b border-[#E2E8E4] h-10 text-[12px] font-display font-semibold uppercase tracking-wider text-[#7C8982]">
                  <th className="px-4">Reference</th>
                  <th className="px-4">SKU &amp; Description</th>
                  <th className="px-4">Type</th>
                  <th className="px-4">Facility Route</th>
                  <th className="px-4 text-right">Prev → New</th>
                  <th className="px-4 text-right">Delta</th>
                  <th className="px-4">Operator &amp; Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E4] text-[13px]">
                {filtered.map((m) => {
                  const isPos = m.quantityDelta >= 0;
                  return (
                    <tr key={m.id} className="h-14 bg-white hover:bg-[#F9FAF7] transition-colors">
                      <td className="px-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-[#17211E]">
                          {m.referenceCode}
                        </div>
                        <div className="text-[11px] font-mono text-[#7C8982]">
                          {m.createdAt.slice(0, 10)}
                        </div>
                      </td>
                      <td className="px-4">
                        <div className="font-mono text-xs text-[#7C8982]">{m.skuCode}</div>
                        <div className="font-medium text-[#17211E]">{m.skuName}</div>
                      </td>
                      <td className="px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 capitalize text-xs font-semibold text-[#17211E]">
                          {m.type === 'inbound' && <ArrowDownLeft className="w-3.5 h-3.5 text-[#28815F]" />}
                          {m.type === 'outbound' && <ArrowUpRight className="w-3.5 h-3.5 text-[#C24C2C]" />}
                          {m.type === 'transfer' && <ArrowLeftRight className="w-3.5 h-3.5 text-[#434846]" />}
                          {m.type === 'adjustment' && <SlidersHorizontal className="w-3.5 h-3.5 text-[#5B4D96]" />}
                          {m.type}
                        </span>
                      </td>
                      <td className="px-4 whitespace-nowrap text-xs text-[#434846]">
                        {m.warehouseName}
                        {m.targetWarehouseName && (
                          <span className="text-[#7C8982]"> → {m.targetWarehouseName}</span>
                        )}
                      </td>
                      <td className="px-4 text-right font-mono text-xs text-[#7C8982] tabular-nums-lining whitespace-nowrap">
                        {m.previousQty} → <strong className="text-[#17211E]">{m.newQty}</strong>
                      </td>
                      <td
                        className={`px-4 text-right font-mono font-bold tabular-nums-lining whitespace-nowrap ${
                          isPos ? 'text-[#0E4331]' : 'text-[#732B1A]'
                        }`}
                      >
                        {isPos ? `+${m.quantityDelta}` : m.quantityDelta}
                      </td>
                      <td className="px-4 max-w-[260px]">
                        <div className="text-xs font-medium text-[#17211E]">{m.operatorName}</div>
                        {m.notes && (
                          <div className="text-[11px] text-[#7C8982] truncate" title={m.notes}>
                            {m.notes}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
