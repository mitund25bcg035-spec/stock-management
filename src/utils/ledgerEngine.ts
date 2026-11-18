import type {
  CurrencyCode,
  MovementType,
  PurchaseOrder,
  SkuItem,
  SkuStatus,
  StockMovement,
  WarehouseHub,
} from '../types/ledger';

export interface SkuValidationErrors {
  code?: string;
  name?: string;
  category?: string;
  warehouseId?: string;
  binLocation?: string;
  quantity?: string;
  reorderPoint?: string;
  unitCost?: string;
  unitPrice?: string;
  supplierId?: string;
  lotNumber?: string;
}

export interface SkuInputPayload {
  code: string;
  name: string;
  category: string;
  warehouseId: string;
  binLocation: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  unitPrice: number;
  supplierId: string;
  lotNumber: string;
  imageUrl?: string;
}

export interface MovementInputPayload {
  skuId: string;
  type: MovementType;
  quantity: number;
  referenceCode: string;
  notes?: string;
  targetWarehouseId?: string;
  targetWarehouseName?: string;
}

export interface PortfolioMetrics {
  totalCostValuation: number;
  totalRetailValuation: number;
  totalUnits: number;
  activeSkuCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingInboundCount: number;
  pendingOutboundCount: number;
  inTransitValue: number;
  averageMarginPct: number;
}

export interface CategoryValuation {
  category: string;
  skuCount: number;
  totalUnits: number;
  costValuation: number;
  sharePct: number;
}

export interface AbcClassificationRow {
  sku: SkuItem;
  totalValue: number;
  cumulativeSharePct: number;
  tier: 'A' | 'B' | 'C';
  runwayDays: number;
}

export function getSkuStatus(
  quantity: number,
  reorderPoint: number,
  multiplier = 1
): SkuStatus {
  if (quantity <= 0) return 'out_of_stock';
  const effectiveThreshold = Math.round(reorderPoint * multiplier);
  if (quantity <= effectiveThreshold) return 'low_stock';
  return 'in_stock';
}

export function validateSkuInput(
  input: SkuInputPayload,
  existingSkus: Pick<SkuItem, 'id' | 'code'>[],
  editingId?: string
): SkuValidationErrors {
  const errors: SkuValidationErrors = {};
  const normalizedCode = input.code.trim().toUpperCase();

  if (!normalizedCode || normalizedCode.length < 2 || normalizedCode.length > 32) {
    errors.code = 'SKU code must be 2–32 characters.';
  } else if (!/^[A-Z0-9-]+$/.test(normalizedCode)) {
    errors.code = 'SKU code may only contain A–Z, 0–9, and hyphens.';
  } else if (
    existingSkus.some(
      (item) => item.code.toUpperCase() === normalizedCode && item.id !== editingId
    )
  ) {
    errors.code = `SKU code ${normalizedCode} already exists.`;
  }

  const trimmedName = input.name.trim();
  if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 120) {
    errors.name = 'Item name must be 2–120 characters.';
  }

  if (!input.category.trim() || input.category.trim().length < 2) {
    errors.category = 'Category is required.';
  }

  if (!input.warehouseId.trim()) {
    errors.warehouseId = 'Assign a primary warehouse hub.';
  }

  if (!input.binLocation.trim() || input.binLocation.trim().length > 32) {
    errors.binLocation = 'Bin location is required (max 32 chars).';
  }

  if (!Number.isFinite(input.quantity) || input.quantity < 0) {
    errors.quantity = 'Quantity must be 0 or greater.';
  }

  if (!Number.isFinite(input.reorderPoint) || input.reorderPoint < 0) {
    errors.reorderPoint = 'Reorder point must be 0 or greater.';
  }

  if (!Number.isFinite(input.unitCost) || input.unitCost < 0) {
    errors.unitCost = 'Unit cost must be 0 or greater.';
  }

  if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
    errors.unitPrice = 'Unit price must be 0 or greater.';
  }

  if (!input.supplierId.trim()) {
    errors.supplierId = 'Select an approved supplier.';
  }

  if (!input.lotNumber.trim() || input.lotNumber.trim().length < 2) {
    errors.lotNumber = 'Lot or batch number is required.';
  }

  return errors;
}

export function validateMovementInput(
  input: MovementInputPayload,
  sku: SkuItem | undefined
): string | null {
  if (!sku) return 'Select a valid SKU.';
  if (!Number.isFinite(input.quantity) || input.quantity === 0) {
    return 'Quantity must be a non-zero number.';
  }
  if (input.type !== 'adjustment' && input.quantity < 0) {
    return 'Use positive quantities for inbound, outbound, and transfer movements.';
  }
  const delta =
    input.type === 'outbound' || input.type === 'transfer'
      ? -Math.abs(input.quantity)
      : input.type === 'inbound'
        ? Math.abs(input.quantity)
        : input.quantity;

  if (sku.quantity + delta < 0) {
    return `Insufficient stock in ${sku.warehouseName}: available ${sku.quantity}, requested ${Math.abs(delta)}.`;
  }
  if (!input.referenceCode.trim() || input.referenceCode.trim().length < 2) {
    return 'Reference code (e.g., PO-401 or SO-118) is required.';
  }
  if (input.type === 'transfer' && !input.targetWarehouseId) {
    return 'Select a destination warehouse for transfers.';
  }
  if (input.type === 'transfer' && input.targetWarehouseId === sku.warehouseId) {
    return 'Destination warehouse must differ from source warehouse.';
  }
  return null;
}

export function applyStockMovement(
  skus: SkuItem[],
  input: MovementInputPayload,
  operatorName: string,
  nowIso: string,
  movementId: string
): { updatedSkus: SkuItem[]; newMovement: StockMovement } {
  const targetSku = skus.find((s) => s.id === input.skuId);
  if (!targetSku) {
    throw new Error(`SKU ${input.skuId} not found.`);
  }

  const validationError = validateMovementInput(input, targetSku);
  if (validationError) {
    throw new Error(validationError);
  }

  const delta =
    input.type === 'outbound' || input.type === 'transfer'
      ? -Math.abs(input.quantity)
      : input.type === 'inbound'
        ? Math.abs(input.quantity)
        : input.quantity;

  const previousQty = targetSku.quantity;
  const newQty = Math.max(0, previousQty + delta);

  const updatedSkus = skus.map((item) =>
    item.id === targetSku.id
      ? {
          ...item,
          quantity: newQty,
          updatedAt: nowIso,
        }
      : item
  );

  const newMovement: StockMovement = {
    id: movementId,
    ownerId: targetSku.ownerId,
    skuId: targetSku.id,
    skuCode: targetSku.code,
    skuName: targetSku.name,
    type: input.type,
    quantityDelta: delta,
    previousQty,
    newQty,
    warehouseId: targetSku.warehouseId,
    warehouseName: targetSku.warehouseName,
    targetWarehouseName: input.targetWarehouseName?.trim() || undefined,
    referenceCode: input.referenceCode.trim().toUpperCase(),
    notes: input.notes?.trim() || undefined,
    operatorName: operatorName.trim() || 'Operations Desk',
    createdAt: nowIso,
  };

  return { updatedSkus, newMovement };
}

export function applyOrderReceipt(
  skus: SkuItem[],
  orders: PurchaseOrder[],
  orderId: string,
  operatorName: string,
  nowIso: string,
  movementId: string
): {
  updatedOrders: PurchaseOrder[];
  updatedSkus: SkuItem[];
  newMovement: StockMovement | null;
} {
  const targetOrder = orders.find((o) => o.id === orderId);
  if (!targetOrder) {
    throw new Error(`Order ${orderId} not found.`);
  }
  if (targetOrder.status === 'received' || targetOrder.status === 'cancelled') {
    throw new Error(`Order ${targetOrder.orderNumber} is already ${targetOrder.status}.`);
  }

  const updatedOrders = orders.map((order) =>
    order.id === orderId
      ? { ...order, status: 'received' as const, updatedAt: nowIso }
      : order
  );

  const targetSku = skus.find((s) => s.id === targetOrder.skuId);
  if (!targetSku) {
    return { updatedOrders, updatedSkus: skus, newMovement: null };
  }

  const movementType: MovementType =
    targetOrder.direction === 'inbound' ? 'inbound' : 'outbound';
  const delta =
    targetOrder.direction === 'inbound'
      ? Math.abs(targetOrder.quantity)
      : -Math.abs(targetOrder.quantity);
  const previousQty = targetSku.quantity;
  const newQty = Math.max(0, previousQty + delta);

  const updatedSkus = skus.map((s) =>
    s.id === targetSku.id ? { ...s, quantity: newQty, updatedAt: nowIso } : s
  );

  const newMovement: StockMovement = {
    id: movementId,
    ownerId: targetSku.ownerId,
    skuId: targetSku.id,
    skuCode: targetSku.code,
    skuName: targetSku.name,
    type: movementType,
    quantityDelta: delta,
    previousQty,
    newQty,
    warehouseId: targetOrder.warehouseId,
    warehouseName: targetOrder.warehouseName,
    referenceCode: targetOrder.orderNumber,
    notes: `${targetOrder.direction === 'inbound' ? 'Received PO from' : 'Dispatched SO to'} ${targetOrder.partnerName}`,
    operatorName,
    createdAt: nowIso,
  };

  return { updatedOrders, updatedSkus, newMovement };
}

export function computePortfolioMetrics(
  skus: SkuItem[],
  orders: PurchaseOrder[],
  lowStockMultiplier = 1
): PortfolioMetrics {
  let totalCostValuation = 0;
  let totalRetailValuation = 0;
  let totalUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const sku of skus) {
    totalCostValuation += sku.quantity * sku.unitCost;
    totalRetailValuation += sku.quantity * sku.unitPrice;
    totalUnits += sku.quantity;
    const status = getSkuStatus(sku.quantity, sku.reorderPoint, lowStockMultiplier);
    if (status === 'low_stock') lowStockCount += 1;
    if (status === 'out_of_stock') outOfStockCount += 1;
  }

  let pendingInboundCount = 0;
  let pendingOutboundCount = 0;
  let inTransitValue = 0;

  for (const order of orders) {
    if (order.status === 'ordered' || order.status === 'in_transit' || order.status === 'draft') {
      if (order.direction === 'inbound') pendingInboundCount += 1;
      else pendingOutboundCount += 1;
    }
    if (order.status === 'in_transit') {
      inTransitValue += order.totalAmount;
    }
  }

  const averageMarginPct =
    totalRetailValuation > 0
      ? ((totalRetailValuation - totalCostValuation) / totalRetailValuation) * 100
      : 0;

  return {
    totalCostValuation,
    totalRetailValuation,
    totalUnits,
    activeSkuCount: skus.length,
    lowStockCount,
    outOfStockCount,
    pendingInboundCount,
    pendingOutboundCount,
    inTransitValue,
    averageMarginPct,
  };
}

export function computeWarehouseStats(
  warehouse: WarehouseHub,
  skus: SkuItem[]
): {
  skuCount: number;
  storedUnits: number;
  utilizationPct: number;
  valuation: number;
  lowStockSkus: number;
} {
  const hubSkus = skus.filter((s) => s.warehouseId === warehouse.id);
  const storedUnits = hubSkus.reduce((acc, s) => acc + s.quantity, 0);
  const valuation = hubSkus.reduce((acc, s) => acc + s.quantity * s.unitCost, 0);
  const lowStockSkus = hubSkus.filter(
    (s) => getSkuStatus(s.quantity, s.reorderPoint) !== 'in_stock'
  ).length;
  const utilizationPct =
    warehouse.capacityUnits > 0
      ? Math.min(100, Math.round((storedUnits / warehouse.capacityUnits) * 100))
      : 0;

  return {
    skuCount: hubSkus.length,
    storedUnits,
    utilizationPct,
    valuation,
    lowStockSkus,
  };
}

export function computeCategoryBreakdown(skus: SkuItem[]): CategoryValuation[] {
  const map = new Map<string, { skuCount: number; totalUnits: number; costValuation: number }>();
  let totalCost = 0;

  for (const sku of skus) {
    const val = sku.quantity * sku.unitCost;
    totalCost += val;
    const prev = map.get(sku.category) ?? { skuCount: 0, totalUnits: 0, costValuation: 0 };
    map.set(sku.category, {
      skuCount: prev.skuCount + 1,
      totalUnits: prev.totalUnits + sku.quantity,
      costValuation: prev.costValuation + val,
    });
  }

  return Array.from(map.entries())
    .map(([category, stats]) => ({
      category,
      skuCount: stats.skuCount,
      totalUnits: stats.totalUnits,
      costValuation: stats.costValuation,
      sharePct: totalCost > 0 ? (stats.costValuation / totalCost) * 100 : 0,
    }))
    .sort((a, b) => b.costValuation - a.costValuation);
}

export function computeAbcClassification(
  skus: SkuItem[],
  movements: StockMovement[]
): AbcClassificationRow[] {
  const sorted = [...skus]
    .map((sku) => ({
      sku,
      totalValue: sku.quantity * sku.unitCost,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);

  const grandTotal = sorted.reduce((acc, r) => acc + r.totalValue, 0);
  let running = 0;

  return sorted.map((row) => {
    running += row.totalValue;
    const cumulativeSharePct = grandTotal > 0 ? (running / grandTotal) * 100 : 100;
    const tier: 'A' | 'B' | 'C' =
      cumulativeSharePct <= 70 ? 'A' : cumulativeSharePct <= 92 ? 'B' : 'C';

    const outboundUnits = movements
      .filter((m) => m.skuId === row.sku.id && (m.type === 'outbound' || m.type === 'transfer'))
      .reduce((acc, m) => acc + Math.abs(m.quantityDelta), 0);
    const dailyBurn = Math.max(1, Math.round(outboundUnits / 14));
    const runwayDays = row.sku.quantity > 0 ? Math.round(row.sku.quantity / dailyBurn) : 0;

    return {
      sku: row.sku,
      totalValue: row.totalValue,
      cumulativeSharePct,
      tier,
      runwayDays,
    };
  });
}

export function formatCurrency(amount: number, currency: CurrencyCode = 'USD'): string {
  const symbolMap: Record<CurrencyCode, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  const rateMap: Record<CurrencyCode, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
  };
  const converted = amount * rateMap[currency];
  return `${symbolMap[currency]}${converted.toLocaleString('en-US', {
    minimumFractionDigits: converted >= 1000 ? 0 : 2,
    maximumFractionDigits: converted >= 1000 ? 0 : 2,
  })}`;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildSkusCsv(skus: SkuItem[]): string {
  const headers = [
    'SKU Code',
    'Item Name',
    'Category',
    'Warehouse',
    'Bin',
    'Quantity',
    'Reorder Point',
    'Unit Cost',
    'Unit Price',
    'Total Cost Value',
    'Supplier',
    'Lot Number',
    'Status',
  ];
  const rows = skus.map((sku) => [
    sku.code,
    sku.name,
    sku.category,
    sku.warehouseName,
    sku.binLocation,
    sku.quantity,
    sku.reorderPoint,
    sku.unitCost.toFixed(2),
    sku.unitPrice.toFixed(2),
    (sku.quantity * sku.unitCost).toFixed(2),
    sku.supplierName,
    sku.lotNumber,
    getSkuStatus(sku.quantity, sku.reorderPoint),
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}
