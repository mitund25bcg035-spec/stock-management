import { useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import type { SkuItem } from '../types/ledger';
import {
  computeAbcClassification,
  computeCategoryBreakdown,
  computeWarehouseStats,
  formatCurrency,
} from '../utils/ledgerEngine';
import { CategoryChip } from './StatusBadge';

interface AnalyticsScreenProps {
  onInspectSku: (sku: SkuItem) => void;
}

export function AnalyticsScreen({ onInspectSku }: AnalyticsScreenProps) {
  const { skus, movements, warehouses, settings } = useLedger();

  const categoryBreakdown = useMemo(() => computeCategoryBreakdown(skus), [skus]);
  const abcRows = useMemo(() => computeAbcClassification(skus, movements), [skus, movements]);
  const warehouseRows = useMemo(
    () => warehouses.map((wh) => ({ wh, stats: computeWarehouseStats(wh, skus) })),
    [warehouses, skus]
  );

  const totalValuation = categoryBreakdown.reduce((acc, c) => acc + c.costValuation, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-[32px] font-semibold tracking-tight text-[#17211E]">
          Forecasting &amp; Valuation
        </h1>
        <p className="text-sm text-[#7C8982] mt-1">
          ABC capital allocation, category concentration, and projected stock runway across active SKUs.
        </p>
      </div>

      {/* Category & Hub Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 card-surface p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#17211E]">
                Valuation by Category
              </h2>
              <p className="text-xs text-[#7C8982]">
                Total inventory cost basis: {formatCurrency(totalValuation, settings.currency)}
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#17211E]">{cat.category}</span>
                    <span className="text-[#7C8982] tabular-nums-lining">
                      {cat.skuCount} SKUs · {cat.totalUnits.toLocaleString()} u
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-[#17211E] tabular-nums-lining">
                    {formatCurrency(cat.costValuation, settings.currency)}{' '}
                    <span className="text-[#7C8982] font-normal">({cat.sharePct.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#E2E8E4] overflow-hidden">
                  <div
                    style={{ width: `${Math.max(4, Math.round(cat.sharePct))}%` }}
                    className="h-full rounded-full bg-[#14211D]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 card-surface p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#17211E]">
              Capital by Regional Hub
            </h2>
            <p className="text-xs text-[#7C8982]">
              Inventory cost distribution and alert concentration
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {warehouseRows.map(({ wh, stats }) => (
              <div
                key={wh.id}
                className="p-3.5 rounded-xl bg-[#F5F7F3] border border-[#E2E8E4] flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-mono text-[11px] font-bold text-[#7C8982]">{wh.code}</div>
                  <div className="text-sm font-semibold text-[#17211E] truncate">{wh.name}</div>
                  <div className="text-xs text-[#7C8982] tabular-nums-lining">
                    {stats.storedUnits.toLocaleString()} units · {stats.lowStockSkus} alerts
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-sm font-bold text-[#17211E] tabular-nums-lining">
                    {formatCurrency(stats.valuation, settings.currency)}
                  </div>
                  <div className="text-[11px] font-mono text-[#434846] tabular-nums-lining">
                    {stats.utilizationPct}% cap
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ABC Velocity & Stock Runway Matrix */}
      <div className="card-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8E4]">
          <h2 className="font-display text-lg font-semibold text-[#17211E]">
            ABC Value Classification &amp; Reorder Runway
          </h2>
          <p className="text-xs text-[#7C8982]">
            Tier A represents top 70% of stocked capital; runway estimates days until depletion at recent burn.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F7F3] border-b border-[#E2E8E4] h-10 text-[12px] font-display font-semibold uppercase tracking-wider text-[#7C8982]">
                <th className="px-4">Tier</th>
                <th className="px-4">SKU &amp; Item</th>
                <th className="px-4">Category</th>
                <th className="px-4 text-right">On-Hand</th>
                <th className="px-4 text-right">Stock Value</th>
                <th className="px-4 text-right">Cumulative %</th>
                <th className="px-4 text-right">Est. Runway</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E4] text-[13px]">
              {abcRows.map((row) => (
                <tr key={row.sku.id} className="h-12 bg-white hover:bg-[#F9FAF7] transition-colors">
                  <td className="px-4">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-mono text-xs font-bold ${
                        row.tier === 'A'
                          ? 'bg-[#14211D] text-[#C7E78B]'
                          : row.tier === 'B'
                            ? 'bg-[#C9C2E6]/45 text-[#362C5C]'
                            : 'bg-[#ECEEEB] text-[#434846]'
                      }`}
                    >
                      {row.tier}
                    </span>
                  </td>
                  <td className="px-4">
                    <button
                      type="button"
                      onClick={() => onInspectSku(row.sku)}
                      className="text-left hover:underline cursor-pointer"
                    >
                      <span className="font-mono text-xs text-[#7C8982] mr-2">
                        {row.sku.code}
                      </span>
                      <span className="font-semibold text-[#17211E]">{row.sku.name}</span>
                    </button>
                  </td>
                  <td className="px-4">
                    <CategoryChip label={row.sku.category} />
                  </td>
                  <td className="px-4 text-right font-mono tabular-nums-lining text-[#17211E]">
                    {row.sku.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 text-right font-mono font-semibold tabular-nums-lining text-[#17211E]">
                    {formatCurrency(row.totalValue, settings.currency)}
                  </td>
                  <td className="px-4 text-right font-mono tabular-nums-lining text-[#434846]">
                    {row.cumulativeSharePct.toFixed(1)}%
                  </td>
                  <td
                    className={`px-4 text-right font-mono font-semibold tabular-nums-lining ${
                      row.runwayDays <= 14 ? 'text-[#732B1A]' : 'text-[#0E4331]'
                    }`}
                  >
                    {row.runwayDays} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
