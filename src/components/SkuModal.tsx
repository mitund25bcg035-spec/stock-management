import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import type { SkuItem } from '../types/ledger';
import { type SkuInputPayload, type SkuValidationErrors, validateSkuInput } from '../utils/ledgerEngine';

const CATEGORIES = ['Sensors', 'Actuators', 'Telemetry', 'Power', 'Enclosures', 'Optics'];

interface SkuModalProps {
  open: boolean;
  editingSku: SkuItem | null;
  onClose: () => void;
}

export function SkuModal({ open, editingSku, onClose }: SkuModalProps) {
  const { skus, warehouses, suppliers, settings, createSku, updateSku } = useLedger();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Sensors');
  const [warehouseId, setWarehouseId] = useState(settings.defaultWarehouseId || warehouses[0]?.id || '');
  const [binLocation, setBinLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reorderPoint, setReorderPoint] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [lotNumber, setLotNumber] = useState('');
  const [errors, setErrors] = useState<SkuValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSubmitError(null);
    if (editingSku) {
      setCode(editingSku.code);
      setName(editingSku.name);
      setCategory(editingSku.category);
      setWarehouseId(editingSku.warehouseId);
      setBinLocation(editingSku.binLocation);
      setQuantity(String(editingSku.quantity));
      setReorderPoint(String(editingSku.reorderPoint));
      setUnitCost(String(editingSku.unitCost));
      setUnitPrice(String(editingSku.unitPrice));
      setSupplierId(editingSku.supplierId);
      setLotNumber(editingSku.lotNumber);
    } else {
      setCode('');
      setName('');
      setCategory('Sensors');
      setWarehouseId(settings.defaultWarehouseId || warehouses[0]?.id || '');
      setBinLocation('');
      setQuantity('');
      setReorderPoint('');
      setUnitCost('');
      setUnitPrice('');
      setSupplierId(suppliers[0]?.id || '');
      setLotNumber('');
    }
  }, [open, editingSku, settings.defaultWarehouseId, warehouses, suppliers]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const payload: SkuInputPayload = {
      code,
      name,
      category,
      warehouseId,
      binLocation,
      quantity: quantity === '' ? Number.NaN : Number(quantity),
      reorderPoint: reorderPoint === '' ? Number.NaN : Number(reorderPoint),
      unitCost: unitCost === '' ? Number.NaN : Number(unitCost),
      unitPrice: unitPrice === '' ? Number.NaN : Number(unitPrice),
      supplierId,
      lotNumber,
    };

    const nextErrors = validateSkuInput(payload, skus, editingSku?.id);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = editingSku
        ? await updateSku(editingSku.id, payload)
        : await createSku(payload);
      if (!res.ok) {
        setSubmitError(res.error || 'Failed to save SKU.');
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
      aria-labelledby="sku-modal-title"
    >
      <div className="modal-surface rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E2E8E4]">
          <div>
            <h2 id="sku-modal-title" className="font-display text-lg font-semibold text-[#17211E]">
              {editingSku ? `Edit SKU · ${editingSku.code}` : 'Register New Inventory SKU'}
            </h2>
            <p className="text-xs text-[#7C8982] mt-0.5">
              Define bin allocation, cost basis, and automatic reorder thresholds.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close SKU modal"
            className="w-9 h-9 rounded-lg border border-[#E2E8E4] flex items-center justify-center text-[#434846] hover:bg-[#F5F7F3] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {submitError && (
            <div className="p-3 rounded-lg bg-[#E9A18D]/25 border border-[#E9A18D] text-xs font-medium text-[#732B1A]">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sku-code" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                SKU Code *
              </label>
              <input
                id="sku-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. KNT-904"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono uppercase focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
              />
              {errors.code && <p className="text-[11px] text-[#BA1A1A] mt-1">{errors.code}</p>}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="sku-name" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                Item Description *
              </label>
              <input
                id="sku-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Optical Proximity Array"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
              />
              {errors.name && <p className="text-[11px] text-[#BA1A1A] mt-1">{errors.name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sku-category" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                Category *
              </label>
              <select
                id="sku-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] bg-white text-sm focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-[11px] text-[#BA1A1A] mt-1">{errors.category}</p>}
            </div>

            <div>
              <label htmlFor="sku-warehouse" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                Warehouse Hub *
              </label>
              <select
                id="sku-warehouse"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] bg-white text-sm focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
              {errors.warehouseId && (
                <p className="text-[11px] text-[#BA1A1A] mt-1">{errors.warehouseId}</p>
              )}
            </div>

            <div>
              <label htmlFor="sku-bin" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                Bin Location *
              </label>
              <input
                id="sku-bin"
                type="text"
                value={binLocation}
                onChange={(e) => setBinLocation(e.target.value.toUpperCase())}
                placeholder="e.g. A-08-03"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono uppercase focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
              />
              {errors.binLocation && (
                <p className="text-[11px] text-[#BA1A1A] mt-1">{errors.binLocation}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="sku-qty" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                On-Hand Qty *
              </label>
              <input
                id="sku-qty"
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="140"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono tabular-nums-lining focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
              />
              {errors.quantity && <p className="text-[11px] text-[#BA1A1A] mt-1">{errors.quantity}</p>}
            </div>

            <div>
              <label htmlFor="sku-reorder" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                Reorder Point *
              </label>
              <input
                id="sku-reorder"
                type="number"
                min={0}
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
                placeholder="30"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono tabular-nums-lining focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
              />
              {errors.reorderPoint && (
                <p className="text-[11px] text-[#BA1A1A] mt-1">{errors.reorderPoint}</p>
              )}
            </div>

            <div>
              <label htmlFor="sku-cost" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                Unit Cost (USD) *
              </label>
              <input
                id="sku-cost"
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="84.50"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono tabular-nums-lining focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
              />
              {errors.unitCost && <p className="text-[11px] text-[#BA1A1A] mt-1">{errors.unitCost}</p>}
            </div>

            <div>
              <label htmlFor="sku-price" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                List Price (USD) *
              </label>
              <input
                id="sku-price"
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="135.00"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono tabular-nums-lining focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
              />
              {errors.unitPrice && <p className="text-[11px] text-[#BA1A1A] mt-1">{errors.unitPrice}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sku-supplier" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                Approved Supplier *
              </label>
              <select
                id="sku-supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] bg-white text-sm focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              {errors.supplierId && (
                <p className="text-[11px] text-[#BA1A1A] mt-1">{errors.supplierId}</p>
              )}
            </div>

            <div>
              <label htmlFor="sku-lot" className="block text-xs font-semibold text-[#17211E] mb-1.5">
                Lot / Batch Number *
              </label>
              <input
                id="sku-lot"
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value.toUpperCase())}
                placeholder="e.g. LOT-26-99A"
                className="w-full h-10 px-3 rounded-lg border border-[#E2E8E4] text-sm font-mono uppercase focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
              />
              {errors.lotNumber && (
                <p className="text-[11px] text-[#BA1A1A] mt-1">{errors.lotNumber}</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8E4] flex items-center justify-end gap-3">
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
              className="h-10 px-5 rounded-lg bg-[#C7E78B] hover:bg-[#B8DC7A] text-[#14211D] text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingSku ? 'Save SKU Changes' : 'Create SKU'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
