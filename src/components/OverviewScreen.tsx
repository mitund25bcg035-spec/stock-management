import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, PackageCheck } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import type { ScreenId, SkuItem } from '../types/ledger';
import { computePortfolioMetrics, formatCurrency, getSkuStatus } from '../utils/ledgerEngine';
import { SkuStatusBadge } from './StatusBadge';

interface OverviewScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onInspectSku: (sku: SkuItem) => void;
  onQuickRestock: (sku: SkuItem) => void;
}

export function OverviewScreen({
  onNavigate,
  onInspectSku,
  onQuickRestock,
}: OverviewScreenProps) {
  const { skus, movements, orders, warehouses, settings } = useLedger();
  const [rangeDays, setRangeDays] = useState<7 | 14>(14);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const metrics = useMemo(
    () => computePortfolioMetrics(skus, orders, settings.lowStockMultiplier),
    [skus, orders, settings.lowStockMultiplier]
  );

  const alertSkus = useMemo(
    () =>
      skus
        .filter(
          (s) => getSkuStatus(s.quantity, s.reorderPoint, settings.lowStockMultiplier) !== 'in_stock'
        )
        .sort((a, b) => a.quantity - b.quantity),
    [skus, settings.lowStockMultiplier]
  );

  // Build deterministic 14-day inflow/outflow velocity series enriched by live movements
  const velocitySeries = useMemo(() => {
    const base = [
      { day: 'Nov 05', inbound: 140, outbound: 95 },
      { day: 'Nov 06', inbound: 85, outbound: 112 },
      { day: 'Nov 07', inbound: 210, outbound: 130 },
      { day: 'Nov 08', inbound: 120, outbound: 145 },
      { day: 'Nov 09', inbound: 90, outbound: 88 },
      { day: 'Nov 10', inbound: 175, outbound: 120 },
      { day: 'Nov 11', inbound: 130, outbound: 165 },
      { day: 'Nov 12', inbound: 240, outbound: 150 },
      { day: 'Nov 13', inbound: 200, outbound: 118 },
      { day: 'Nov 14', inbound: 115, outbound: 142 },
      { day: 'Nov 15', inbound: 160, outbound: 138 },
      { day: 'Nov 16', inbound: 195, outbound: 126 },
      { day: 'Nov 17', inbound: 180, outbound: 168 },
      {
        day: 'Today',
        inbound:
          movements
            .filter((m) => m.quantityDelta > 0)
            .slice(0, 3)
            .reduce((acc, m) => acc + m.quantityDelta, 0) || 120,
        outbound:
          movements
            .filter((m) => m.quantityDelta < 0)
            .slice(0, 3)
            .reduce((acc, m) => acc + Math.abs(m.quantityDelta), 0) || 95,
      },
    ];
    return rangeDays === 7 ? base.slice(-7) : base;
  }, [movements, rangeDays]);

  const maxFlow = Math.max(
    100,
    ...velocitySeries.flatMap((d) => [d.inbound, d.outbound])
  );

  const recentMovements = movements.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-[32px] font-semibold tracking-tight text-[#17211E] leading-tight">
            Operations Ledger Overview
          </h1>
          <p className="text-sm text-[#7C8982] mt-1">
            Real-time inventory valuation, hub stock posture, and replenishment queue across{' '}
            {warehouses.length} active facilities.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#7C8982]">
          <span>Margin Avg</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono font-semibold text-[#17211E] tabular-nums-lining">
            {metrics.averageMarginPct.toFixed(1)}%
          </span>
          <span aria-hidden="true">·</span>
          <span>Currency</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono font-semibold text-[#17211E]">{settings.currency}</span>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <section aria-label="Key Inventory Metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <div className="card-surface p-6">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.04em] text-[#7C8982]">
            Inventory Cost Valuation
          </p>
          <p className="font-display text-3xl sm:text-[36px] font-bold text-[#17211E] tracking-tight tabular-nums-lining mt-2">
            {formatCurrency(metrics.totalCostValuation, settings.currency)}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-[#0E4331] font-semibold tabular-nums-lining">
            <span>Retail {formatCurrency(metrics.totalRetailValuation, settings.currency)}</span>
          </div>
        </div>

        <div className="card-surface p-6">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.04em] text-[#7C8982]">
            Active SKUs &amp; Units
          </p>
          <p className="font-display text-3xl sm:text-[36px] font-bold text-[#17211E] tracking-tight tabular-nums-lining mt-2">
            {metrics.activeSkuCount}
            <span className="text-lg font-semibold text-[#7C8982] ml-2">
              / {metrics.totalUnits.toLocaleString()} u
            </span>
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-[#7C8982]">
            <span>Across {warehouses.length} hubs</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-[#17211E] font-semibold hover:underline cursor-pointer"
            >
              View catalog
            </button>
          </div>
        </div>

        <div className="card-surface p-6">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.04em] text-[#7C8982]">
            Reorder &amp; Depletion Alerts
          </p>
          <p className="font-display text-3xl sm:text-[36px] font-bold text-[#17211E] tracking-tight tabular-nums-lining mt-2">
            {metrics.lowStockCount + metrics.outOfStockCount}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#732B1A] tabular-nums-lining">
            <span>
              {metrics.outOfStockCount} depleted · {metrics.lowStockCount} low
            </span>
          </div>
        </div>

        <div className="card-surface p-6">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.04em] text-[#7C8982]">
            Pending Orders Pipeline
          </p>
          <p className="font-display text-3xl sm:text-[36px] font-bold text-[#17211E] tracking-tight tabular-nums-lining mt-2">
            {metrics.pendingInboundCount + metrics.pendingOutboundCount}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-[#434846] tabular-nums-lining">
            <span>{metrics.pendingInboundCount} inbound PO</span>
            <span aria-hidden="true">·</span>
            <span>{formatCurrency(metrics.inTransitValue, settings.currency)} in transit</span>
          </div>
        </div>
      </section>

      {/* Main Analytical Split: 8 cols Flow Chart + 4 cols Priority Reorder Queue */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 card-surface p-6 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#17211E]">
                Unit Velocity &amp; Net Movement
              </h2>
              <p className="text-xs text-[#7C8982] mt-0.5">
                Daily inbound receipts vs. outbound fulfillment dispatches
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 text-xs text-[#434846]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#14211D]" />
                  Inbound
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#C7E78B]" />
                  Outbound
                </span>
              </div>
              <div className="inline-flex p-0.5 rounded-lg bg-[#F5F7F3] border border-[#E2E8E4]">
                <button
                  type="button"
                  onClick={() => setRangeDays(7)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    rangeDays === 7 ? 'bg-white text-[#14211D] shadow-xs' : 'text-[#7C8982]'
                  }`}
                >
                  7D
                </button>
                <button
                  type="button"
                  onClick={() => setRangeDays(14)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    rangeDays === 14 ? 'bg-white text-[#14211D] shadow-xs' : 'text-[#7C8982]'
                  }`}
                >
                  14D
                </button>
              </div>
            </div>
          </div>

          {/* Crisp Swiss Bar & Baseline Chart */}
          <div className="relative flex-1 flex flex-col justify-end">
            <div className="relative h-64 lg:h-72 w-full flex items-end gap-2 sm:gap-3 pt-6 pb-0 border-b border-[#E2E8E4] pl-8">
              {/* Y-Axis Hairline Reference Rules */}
              <div className="pointer-events-none absolute inset-0 left-0 flex flex-col justify-between pt-6 pb-0">
                {[maxFlow, Math.round(maxFlow / 2), 0].map((tick, tIdx) => (
                  <div key={tIdx} className="flex items-center gap-2 w-full">
                    <span className="w-6 text-right font-mono text-[10px] text-[#7C8982] tabular-nums-lining">
                      {tick}
                    </span>
                    <div
                      className={`flex-1 ${
                        tick === 0 ? 'border-b border-transparent' : 'border-b border-dashed border-[#E2E8E4]'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {velocitySeries.map((point, idx) => {
                const inPct = Math.max(4, Math.round((point.inbound / maxFlow) * 100));
                const outPct = Math.max(4, Math.round((point.outbound / maxFlow) * 100));
                const isHovered = hoveredIdx === idx;
                return (
                  <div
                    key={point.day}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="relative z-[1] flex-1 flex flex-col items-center justify-end h-full group"
                  >
                    {isHovered && (
                      <div className="absolute -top-1 z-10 popover-surface rounded-lg px-2.5 py-1.5 text-[11px] font-mono tabular-nums-lining whitespace-nowrap pointer-events-none">
                        <div className="font-semibold text-[#17211E]">{point.day}</div>
                        <div className="text-[#0E4331]">+{point.inbound} in</div>
                        <div className="text-[#434846]">-{point.outbound} out</div>
                      </div>
                    )}
                    <div className="w-full h-full flex items-end justify-center gap-1">
                      <div
                        style={{ height: `${inPct}%` }}
                        className="w-2.5 sm:w-3.5 rounded-t bg-[#14211D] transition-all duration-150 group-hover:opacity-90"
                      />
                      <div
                        style={{ height: `${outPct}%` }}
                        className="w-2.5 sm:w-3.5 rounded-t bg-[#C7E78B] transition-all duration-150 group-hover:bg-[#B8DC7A]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 pl-8">
              {velocitySeries.map((point) => (
                <span
                  key={point.day}
                  className="flex-1 text-center text-[10px] font-mono text-[#7C8982] truncate"
                >
                  {point.day.replace('Nov ', 'N')}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Low Stock Priority Queue */}
        <div className="lg:col-span-4 card-surface p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#17211E]">
                Priority Replenishment
              </h2>
              <p className="text-xs text-[#7C8982] mt-0.5">
                SKUs at or below reorder threshold
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-[#14211D] hover:underline cursor-pointer whitespace-nowrap"
            >
              View POs
            </button>
          </div>

          {alertSkus.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <PackageCheck className="w-8 h-8 text-[#28815F] mb-2" />
              <p className="text-sm font-semibold text-[#17211E]">All SKUs Above Threshold</p>
              <p className="text-xs text-[#7C8982] mt-1">
                No replenishment triggers currently active.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8E4] flex-1">
              {alertSkus.slice(0, 4).map((sku) => {
                const status = getSkuStatus(
                  sku.quantity,
                  sku.reorderPoint,
                  settings.lowStockMultiplier
                );
                const pct =
                  sku.reorderPoint > 0
                    ? Math.min(100, Math.round((sku.quantity / sku.reorderPoint) * 100))
                    : 0;
                return (
                  <div
                    key={sku.id}
                    className="py-3.5 first:pt-1 last:pb-1 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onInspectSku(sku)}
                        className="text-left min-w-0 cursor-pointer group"
                      >
                        <p className="text-xs font-mono font-semibold text-[#7C8982]">
                          {sku.code}
                        </p>
                        <p className="text-sm font-semibold text-[#17211E] truncate group-hover:underline">
                          {sku.name}
                        </p>
                      </button>
                      <SkuStatusBadge status={status} />
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#434846] tabular-nums-lining">
                      <span>
                        On hand: <strong className="font-mono text-[#17211E]">{sku.quantity}</strong> /{' '}
                        {sku.reorderPoint} min
                      </span>
                      <button
                        type="button"
                        onClick={() => onQuickRestock(sku)}
                        className="px-2.5 py-1 rounded-md bg-[#14211D] text-white text-[11px] font-semibold hover:bg-[#23332D] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Restock
                      </button>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-[#E2E8E4] overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-[#E9A18D]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Recent Ledger Activity Table */}
      <section className="card-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8E4] flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#17211E]">
              Recent Stock Ledger Activity
            </h2>
            <p className="text-xs text-[#7C8982]">
              Latest verified inventory movements across regional hubs
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('movements')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14211D] hover:underline cursor-pointer whitespace-nowrap"
          >
            <span>Open Full Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F7F3] border-b border-[#E2E8E4] h-10 text-[12px] font-display font-semibold uppercase tracking-wider text-[#7C8982]">
                <th className="px-4 py-2">Reference</th>
                <th className="px-4 py-2">SKU &amp; Item</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Hub</th>
                <th className="px-4 py-2 text-right">Delta</th>
                <th className="px-4 py-2 text-right">Balance</th>
                <th className="px-4 py-2 text-right">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] text-[13px]">
              {recentMovements.map((mov) => {
                const isPositive = mov.quantityDelta >= 0;
                return (
                  <tr key={mov.id} className="h-12 bg-white hover:bg-[#F9FAF7] transition-colors">
                    <td className="px-4 font-mono text-xs font-medium text-[#17211E] whitespace-nowrap">
                      {mov.referenceCode}
                    </td>
                    <td className="px-4">
                      <span className="font-mono text-xs text-[#7C8982] mr-2">{mov.skuCode}</span>
                      <span className="font-medium text-[#17211E]">{mov.skuName}</span>
                    </td>
                    <td className="px-4 capitalize text-[#434846] whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        {isPositive ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-[#28815F]" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#C24C2C]" />
                        )}
                        {mov.type}
                      </span>
                    </td>
                    <td className="px-4 text-[#434846] whitespace-nowrap">{mov.warehouseName}</td>
                    <td
                      className={`px-4 text-right font-mono font-semibold tabular-nums-lining whitespace-nowrap ${
                        isPositive ? 'text-[#0E4331]' : 'text-[#732B1A]'
                      }`}
                    >
                      {isPositive ? `+${mov.quantityDelta}` : mov.quantityDelta}
                    </td>
                    <td className="px-4 text-right font-mono tabular-nums-lining text-[#17211E] whitespace-nowrap">
                      {mov.newQty} u
                    </td>
                    <td className="px-4 text-right text-[#7C8982] whitespace-nowrap">
                      {mov.operatorName}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
