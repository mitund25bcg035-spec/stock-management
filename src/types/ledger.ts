export type ScreenId =
  | 'overview'
  | 'inventory'
  | 'movements'
  | 'warehouses'
  | 'orders'
  | 'suppliers'
  | 'analytics'
  | 'settings';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP';

export type SkuStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type MovementType = 'inbound' | 'outbound' | 'transfer' | 'adjustment';

export type OrderDirection = 'inbound' | 'outbound';

export type OrderStatus = 'draft' | 'ordered' | 'in_transit' | 'received' | 'cancelled';

export type WarehouseStatus = 'operational' | 'congested' | 'maintenance';

export type SupplierStatus = 'active' | 'review';

export interface SkuItem {
  id: string;
  ownerId: string;
  code: string;
  name: string;
  category: string;
  warehouseId: string;
  warehouseName: string;
  binLocation: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  unitPrice: number;
  supplierId: string;
  supplierName: string;
  lotNumber: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseHub {
  id: string;
  ownerId: string;
  code: string;
  name: string;
  region: string;
  address: string;
  capacityUnits: number;
  managerName: string;
  status: WarehouseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  ownerId: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  type: MovementType;
  quantityDelta: number;
  previousQty: number;
  newQty: number;
  warehouseId: string;
  warehouseName: string;
  targetWarehouseName?: string;
  referenceCode: string;
  notes?: string;
  operatorName: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  ownerId: string;
  orderNumber: string;
  direction: OrderDirection;
  partnerName: string;
  supplierId?: string;
  warehouseId: string;
  warehouseName: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  quantity: number;
  totalAmount: number;
  status: OrderStatus;
  etaDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierPartner {
  id: string;
  ownerId: string;
  name: string;
  code: string;
  region: string;
  contactEmail: string;
  leadTimeDays: number;
  onTimeRate: number;
  activeCategory: string;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSettings {
  organizationName: string;
  currency: CurrencyCode;
  lowStockMultiplier: number;
  defaultWarehouseId: string;
  operatorName: string;
}
