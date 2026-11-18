import { ArrowDownLeft, ArrowUpRight, Box, MapPin, Pencil, Trash2, X } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import type { MovementType, SkuItem } from '../types/ledger';
import { formatCurrency, getSkuStatus } from '../utils/ledgerEngine';
import { CategoryChip, SkuStatusBadge } from './StatusBadge';

interface SkuDetailDrawerProps {
  sku: SkuItem | null;
  onClose: () => void;
  onEdit: (sku: SkuItem) => void;
  onLogMovement: (sku: SkuItem, type: MovementType) => void;
}

export function SkuDetailDrawer({
  sku,
  onClose,
  onEdit,
  onLogMovement,
}: SkuDetailDrawerProps) {
  const { movements, settings, deleteSku } = useLedger();

  if (!sku) return null;

  const status = getSkuStatus(sku.quantity, sku.reorderPoint, settings.lowStockMultiplier);
  const skuMovements = movements.filter((m) => m.skuId === sku.id).slice(0, 8);
  const marginPct =
    sku.unitPrice > 0 ? (((sku.unitPrice - sku.unitCost) / sku.unitPrice) * 100).toFixed(1) : '0.0';
  const fillPct =
    sku.reorderPoint > 0
      ? Math.min(100, Math.round((sku.quantity / (sku.reorderPoint * 2)) * 100))
      : 100;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#14211D]/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-sku-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <aside className="relative z-10 w-full max-w-xl bg-white h-full border-l border-[#E2E8E4] shadow-2xl flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-[#E2E8E4] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-[#7C8982]">{sku.code}</span>
              <CategoryChip label={sku.category} />
              <SkuStatusBadge status={status} />
            </div>
            <h2
              id="drawer-sku-title"
              className="font-display text-xl font-semibold text-[#17211E] truncate"
            >
              {sku.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close SKU inspector"
            className="w-9 h-9 rounded-lg border border-[#E2E8E4] flex items-center justify-center text-[#434846] hover:bg-[#F5F7F3] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Studio Product Image / Fallback */}
          <div className="rounded-2xl border border-[#E2E8E4] bg-[#F5F7F3] overflow-hidden aspect-[16/9] flex items-center justify-center">
            {sku.imageUrl ? (
              <img
                src={sku.imageUrl}
                alt={sku.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-[#7C8982] p-6">
                <Box className="w-10 h-10 mb-2 opacity-60" />
                <span className="text-xs font-mono font-semibold">{sku.code}</span>
              </div>
            )}
          </div>

          {/* Stock Threshold Gauge & Quick Actions */}
          <div className="p-5 rounded-2xl bg-[#F5F7F3] border border-[#E2E8E4] space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-display font-bold uppercase tracking-wider text-[#7C8982]">
                  Current Stock Balance
                </p>
                <p className="font-display text-3xl font-bold text-[#17211E] tabular-nums-lining mt-0.5">
                  {sku.quantity.toLocaleString()} units
                </p>
              </div>
              <div className="text-right text-xs text-[#434846] tabular-nums-lining">
                <div>Reorder Point: <strong className="font-mono">{sku.reorderPoint}</strong></div>
                <div>Valuation: <strong className="font-mono">{formatCurrency(sku.quantity * sku.unitCost, settings.currency)}</strong></div>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-[#E2E8E4] overflow-hidden">
              <div
                style={{ width: `${fillPct}%` }}
                className={`h-full rounded-full ${
                  status === 'in_stock' ? 'bg-[#C7E78B]' : 'bg-[#E9A18D]'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => onLogMovement(sku, 'inbound')}
                className="h-9 px-3 rounded-lg bg-[#C7E78B] hover:bg-[#B8DC7A] text-[#14211D] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Log Inbound</span>
              </button>
              <button
                type="button"
                onClick={() => onLogMovement(sku, 'outbound')}
                className="h-9 px-3 rounded-lg bg-[#14211D] hover:bg-[#23332D] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Dispatch Outbound</span>
              </button>
            </div>
          </div>

          {/* Financial & Logistics Specs Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[#E2E8E4]">
              <p className="text-[11px] font-display font-bold uppercase tracking-wider text-[#7C8982]">
                Hub &amp; Bin
              </p>
              <p className="text-sm font-semibold text-[#17211E] mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#7C8982] shrink-0" />
                <span className="truncate">{sku.warehouseName}</span>
              </p>
              <p className="text-xs font-mono text-[#7C8982] mt-0.5">Bin {sku.binLocation}</p>
            </div>

            <div className="p-4 rounded-xl border border-[#E2E8E4]">
              <p className="text-[11px] font-display font-bold uppercase tracking-wider text-[#7C8982]">
                Unit Economics
              </p>
              <p className="text-sm font-mono font-semibold text-[#17211E] tabular-nums-lining mt-1">
                {formatCurrency(sku.unitCost, settings.currency)} cost /{' '}
                {formatCurrency(sku.unitPrice, settings.currency)} list
              </p>
              <p className="text-xs text-[#0E4331] font-semibold mt-0.5 tabular-nums-lining">
                {marginPct}% gross margin
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E2E8E4] col-span-2 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-display font-bold uppercase tracking-wider text-[#7C8982]">
                  Approved Supplier
                </p>
                <p className="text-sm font-semibold text-[#17211E] mt-0.5">{sku.supplierName}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-display font-bold uppercase tracking-wider text-[#7C8982]">
                  Active Lot
                </p>
                <p className="text-sm font-mono font-semibold text-[#17211E] mt-0.5">
                  {sku.lotNumber}
                </p>
              </div>
            </div>
          </div>

          {/* SKU Movement History */}
          <div>
            <h3 className="font-display text-sm font-semibold text-[#17211E] mb-3">
              Lot &amp; Movement History
            </h3>
            {skuMovements.length === 0 ? (
              <p className="text-xs text-[#7C8982] p-4 rounded-xl border border-[#E2E8E4] bg-[#F5F7F3]">
                No recorded movements for this SKU yet.
              </p>
            ) : (
              <div className="border border-[#E2E8E4] rounded-xl overflow-hidden divide-y divide-[#E2E8E4]">
                {skuMovements.map((m) => (
                  <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[#17211E]">
                          {m.referenceCode}
                        </span>
                        <span className="capitalize text-[#7C8982]">{m.type}</span>
                      </div>
                      {m.notes && (
                        <p className="text-[#434846] truncate mt-0.5">{m.notes}</p>
                      )}
                    </div>
                    <div className="text-right font-mono tabular-nums-lining shrink-0">
                      <div
                        className={`font-bold ${
                          m.quantityDelta >= 0 ? 'text-[#0E4331]' : 'text-[#732B1A]'
                        }`}
                      >
                        {m.quantityDelta >= 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                      </div>
                      <div className="text-[11px] text-[#7C8982]">Bal {m.newQty}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E2E8E4] bg-[#F5F7F3] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              void deleteSku(sku.id);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[#E9A18D] text-xs font-semibold text-[#732B1A] hover:bg-[#E9A18D]/20 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove SKU</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(sku);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#14211D] text-white text-xs font-semibold hover:bg-[#23332D] cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Specifications</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
