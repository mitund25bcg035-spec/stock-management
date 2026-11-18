import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import type { MovementType } from '../types/ledger';
import { validateMovementInput } from '../utils/ledgerEngine';

interface MovementModalProps {
  open: boolean;
  preselectedSkuId?: string | null;
  preselectedType?: MovementType;
  onClose: () => void;
}

export function MovementModal({
  open,
  preselectedSkuId,
  preselectedType = 'inbound',
  onClose,
}: MovementModalProps) {
  const { skus, warehouses, recordMovement } = useLedger();

  const [skuId, setSkuId] = useState('');
  const [type, setType] = useState<MovementType>('inbound');
  const [quantity, setQuantity] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSkuId(preselectedSkuId || skus[0]?.id || '');
    setType(preselectedType);
    setQuantity('');
    setReferenceCode('');
    setTargetWarehouseId('');
    setNotes('');
  }, [open, preselectedSkuId, preselectedType, skus]);

  if (!open) return null;

  const selectedSku = skus.find((s) => s.id === skuId);
  const parsedQty = quantity === '' ? Number.NaN : Number(quantity);
  const previewDelta =
    Number.isFinite(parsedQty) && parsedQty !== 0
      ? type === 'outbound' || type === 'transfer'
        ? -Math.abs(parsedQty)
        : type === 'inbound'
          ? Math.abs(parsedQty)
          : parsedQty
      : 0;
  const previewNewQty = selectedSku ? selectedSku.quantity + previewDelta : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetWh = warehouses.find((w) => w.id === targetWarehouseId);
    const payload = {
      skuId,
      type,
      quantity: parsedQty,
      referenceCode,
      notes,
      targetWarehouseId: type === 'transfer' ? targetWarehouseId : undefined,
      targetWarehouseName: type === 'transfer' ? targetWh?.name : undefined,
    };

    const validationError = validateMovementInput(payload, selectedSku);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await recordMovement(payload);
      if (!res.ok) {
        setError(res.error || 'Failed to log movement.');
        return;
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#14211D]/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="movement-modal-title"
    >
      <div className="modal-surface rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8E4]">
          <div>
            <h2 id="movement-modal-title" className="font-display text-lg font-semibold text-[#17211E]">
              Record Stock Movement
            </h2>
            <p className="text-xs text-[#7C8982] mt-0.5">
              Commit an auditable inbound, outbound, transfer, or cycle adjustment entry.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close movement modal"
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

          <div>
            <label htmlFor="mov-sku" className="block text-xs font-semibold text-[#17211E] mb-1.5">
              Target SKU *
            </label>
            <select
              id="mov-sku"
              value={skuId}
              onChange={(e) => setSkuId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] bg-white text-sm focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
            >
              {skus.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name} ({s.quantity} on hand)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="mov-type" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                Movement Type *
              </label>
              <select
                id="mov-type"
                value={type}
                onChange={(e) => setType(e.target.value as MovementType)}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] bg-white text-sm focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
              >
                <option value="inbound">Inbound Receipt (+)</option>
                <option value="outbound">Outbound Dispatch (-)</option>
                <option value="transfer">Hub Transfer (-)</option>
                <option value="adjustment">Cycle Adjustment (+/-)</option>
              </select>
            </div>

            <div>
              <label htmlFor="mov-qty" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                Quantity *
              </label>
              <input
                id="mov-qty"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={type === 'adjustment' ? '-5 or 12' : '25'}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono tabular-nums-lining focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
              />
            </div>
          </div>

          {type === 'transfer' && (
            <div>
              <label htmlFor="mov-dest" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                Destination Warehouse Hub *
              </label>
              <select
                id="mov-dest"
                value={targetWarehouseId}
                onChange={(e) => setTargetWarehouseId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] bg-white text-sm focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
              >
                <option value="">Select destination hub...</option>
                {warehouses
                  .filter((w) => w.id !== selectedSku?.warehouseId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} — {w.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="mov-ref" className="block text-xs font-semibold text-[#17211E] mb-1.5">
              Reference / Manifest Code *
            </label>
            <input
              id="mov-ref"
              type="text"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value.toUpperCase())}
              placeholder="e.g. SO-26-501 or PO-26-890"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono uppercase focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
            />
          </div>

          <div>
            <label htmlFor="mov-notes" className="block text-xs font-semibold text-[#17211E] mb-1.5">
              Operational Notes
            </label>
            <input
              id="mov-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional carrier, bay, or audit detail"
              className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
            />
          </div>

          {selectedSku && (
            <div className="p-3 rounded-lg bg-[#F5F7F3] border border-[#E2E8E4] flex items-center justify-between text-xs">
              <span className="text-[#434846]">
                {selectedSku.warehouseName} · Current: <strong className="font-mono tabular-nums-lining">{selectedSku.quantity}</strong>
              </span>
              <span className="font-mono font-semibold tabular-nums-lining text-[#17211E]">
                Resulting Stock: {previewNewQty} units
              </span>
            </div>
          )}

          <div className="pt-3 border-t border-[#E2E8E4] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-[#E2E8E4] text-sm font-semibold text-[#17211E] hover:bg-[#F5F7F3] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-5 rounded-lg bg-[#14211D] hover:bg-[#23332D] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Committing...' : 'Commit Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
