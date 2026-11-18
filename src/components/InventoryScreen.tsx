import { useMemo, useState } from 'react';
import { Download, Eye, Pencil, Search, Trash2 } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import type { SkuItem, SkuStatus } from '../types/ledger';
import { formatCurrency, getSkuStatus } from '../utils/ledgerEngine';
import { CategoryChip, SkuStatusBadge } from './StatusBadge';

interface InventoryScreenProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddSku: () => void;
  onEditSku: (sku: SkuItem) => void;
  onInspectSku: (sku: SkuItem) => void;
}

export function InventoryScreen({
  searchQuery,
  onSearchChange,
  onAddSku,
  onEditSku,
  onInspectSku,
}: InventoryScreenProps) {
  const { skus, warehouses, settings, bulkDeleteSkus, deleteSku, exportSkusCsv } = useLedger();

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SkuStatus>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const categories = useMemo(
    () => Array.from(new Set(skus.map((s) => s.category))).sort(),
    [skus]
  );

  const filteredSkus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return skus.filter((sku) => {
      if (categoryFilter !== 'ALL' && sku.category !== categoryFilter) return false;
      if (warehouseFilter !== 'ALL' && sku.warehouseId !== warehouseFilter) return false;
      const st = getSkuStatus(sku.quantity, sku.reorderPoint, settings.lowStockMultiplier);
      if (statusFilter !== 'ALL' && st !== statusFilter) return false;
      if (q) {
        const hay = `${sku.code} ${sku.name} ${sku.category} ${sku.lotNumber} ${sku.warehouseName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [skus, searchQuery, categoryFilter, warehouseFilter, statusFilter, settings.lowStockMultiplier]);

  const allSelected =
    filteredSkus.length > 0 && filteredSkus.every((s) => selectedIds.includes(s.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSkus.map((s) => s.id));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    await bulkDeleteSkus(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-[32px] font-semibold tracking-tight text-[#17211E]">
            Inventory Catalog
          </h1>
          <p className="text-sm text-[#7C8982] mt-1">
            Master SKU ledger with bin allocations, threshold gauges, and unit cost basis.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => exportSkusCsv(filteredSkus)}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-[#E2E8E4] bg-white hover:bg-[#F5F7F3] text-xs font-semibold text-[#17211E] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Segmented Status Bar */}
      <div className="card-surface p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px] sm:w-64">
            <Search className="w-4 h-4 text-[#7C8982] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter code, name, or lot..."
              aria-label="Filter inventory catalog"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#E2E8E4] text-sm focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D]"
            />
          </div>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[#E2E8E4] bg-white text-xs font-semibold text-[#17211E] focus:border-[#14211D] focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by warehouse"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[#E2E8E4] bg-white text-xs font-semibold text-[#17211E] focus:border-[#14211D] focus:outline-none"
          >
            <option value="ALL">All Warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex items-center p-1 rounded-lg bg-[#F5F7F3] border border-[#E2E8E4] self-start lg:self-auto">
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: 'in_stock', label: 'In Stock' },
              { id: 'low_stock', label: 'Low Stock' },
              { id: 'out_of_stock', label: 'Depleted' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-[#14211D] shadow-xs'
                  : 'text-[#7C8982] hover:text-[#17211E]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="px-4 py-2.5 rounded-xl bg-[#14211D] text-white flex items-center justify-between gap-4">
          <span className="text-xs font-semibold tabular-nums-lining">
            {selectedIds.length} SKU(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                exportSkusCsv(skus.filter((s) => selectedIds.includes(s.id)))
              }
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
            >
              Export Selected
            </button>
            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              className="px-3 py-1.5 rounded-lg bg-[#E9A18D] text-[#14211D] hover:bg-[#E08E77] text-xs font-bold cursor-pointer"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* SKU Ledger Table */}
      <div className="card-surface overflow-hidden">
        {filteredSkus.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-display text-base font-semibold text-[#17211E]">
              No SKUs match the active filters
            </p>
            <p className="text-xs text-[#7C8982] mt-1 mb-4">
              Reset your search filters or register a new inventory item.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  setCategoryFilter('ALL');
                  setWarehouseFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="h-9 px-4 rounded-lg border border-[#E2E8E4] text-xs font-semibold text-[#17211E] hover:bg-[#F5F7F3] cursor-pointer"
              >
                Clear Filters
              </button>
              <button
                type="button"
                onClick={onAddSku}
                className="h-9 px-4 rounded-lg bg-[#C7E78B] text-[#14211D] text-xs font-bold hover:bg-[#B8DC7A] cursor-pointer"
              >
                Add SKU
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F7F3] border-b border-[#E2E8E4] h-10 text-[12px] font-display font-semibold uppercase tracking-wider text-[#7C8982]">
                  <th className="pl-4 pr-2 w-9">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all visible SKUs"
                      className="w-[18px] h-[18px] rounded accent-[#14211D] cursor-pointer"
                    />
                  </th>
                  <th className="px-3 whitespace-nowrap">SKU / Item</th>
                  <th className="px-3 whitespace-nowrap">Category</th>
                  <th className="px-3 whitespace-nowrap">Warehouse &amp; Bin</th>
                  <th className="px-3 text-right whitespace-nowrap">Stock Level</th>
                  <th className="px-3 text-right whitespace-nowrap">Unit Cost</th>
                  <th className="px-3 text-right whitespace-nowrap">Total Value</th>
                  <th className="px-3 whitespace-nowrap">Status</th>
                  <th className="pl-3 pr-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E4] text-[13px]">
                {filteredSkus.map((sku) => {
                  const status = getSkuStatus(
                    sku.quantity,
                    sku.reorderPoint,
                    settings.lowStockMultiplier
                  );
                  const gaugePct =
                    sku.reorderPoint > 0
                      ? Math.min(100, Math.round((sku.quantity / (sku.reorderPoint * 2)) * 100))
                      : 100;

                  return (
                    <tr
                      key={sku.id}
                      className="h-14 bg-white hover:bg-[#F9FAF7] transition-colors"
                    >
                      <td className="pl-4 pr-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(sku.id)}
                          onChange={() => toggleOne(sku.id)}
                          aria-label={`Select ${sku.code}`}
                          className="w-[18px] h-[18px] rounded accent-[#14211D] cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => onInspectSku(sku)}
                          className="text-left group cursor-pointer"
                        >
                          <div className="font-mono text-xs font-semibold text-[#7C8982] whitespace-nowrap">
                            {sku.code} · {sku.lotNumber}
                          </div>
                          <div className="font-semibold text-[#17211E] group-hover:underline">
                            {sku.name}
                          </div>
                        </button>
                      </td>
                      <td className="px-3">
                        <CategoryChip label={sku.category} />
                      </td>
                      <td className="px-3 whitespace-nowrap">
                        <div className="text-[#17211E] font-medium">{sku.warehouseName}</div>
                        <div className="text-[11px] font-mono text-[#7C8982]">
                          Bin {sku.binLocation}
                        </div>
                      </td>
                      <td className="px-3 text-right">
                        <div className="font-mono font-semibold text-[#17211E] tabular-nums-lining whitespace-nowrap">
                          {sku.quantity.toLocaleString()}
                          <span className="text-[11px] text-[#7C8982] font-normal ml-1">
                            / {sku.reorderPoint}
                          </span>
                        </div>
                        <div className="w-20 ml-auto mt-1 h-1.5 rounded-full bg-[#E2E8E4] overflow-hidden">
                          <div
                            style={{ width: `${gaugePct}%` }}
                            className={`h-full rounded-full ${
                              status === 'in_stock' ? 'bg-[#C7E78B]' : 'bg-[#E9A18D]'
                            }`}
                          />
                        </div>
                      </td>
                      <td className="px-3 text-right font-mono tabular-nums-lining text-[#434846] whitespace-nowrap">
                        {formatCurrency(sku.unitCost, settings.currency)}
                      </td>
                      <td className="px-3 text-right font-mono font-semibold tabular-nums-lining text-[#17211E] whitespace-nowrap">
                        {formatCurrency(sku.quantity * sku.unitCost, settings.currency)}
                      </td>
                      <td className="px-3 whitespace-nowrap">
                        <SkuStatusBadge status={status} />
                      </td>
                      <td className="pl-3 pr-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onInspectSku(sku)}
                            aria-label={`Inspect ${sku.code}`}
                            title="Inspect SKU"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#434846] hover:bg-[#ECEEEB] transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditSku(sku)}
                            aria-label={`Edit ${sku.code}`}
                            title="Edit SKU"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#434846] hover:bg-[#ECEEEB] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteSku(sku.id)}
                            aria-label={`Delete ${sku.code}`}
                            title="Delete SKU"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#732B1A] hover:bg-[#E9A18D]/25 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
