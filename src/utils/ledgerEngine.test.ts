import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOrderReceipt,
  applyStockMovement,
  buildSkusCsv,
  computeAbcClassification,
  computeCategoryBreakdown,
  computePortfolioMetrics,
  getSkuStatus,
  validateMovementInput,
  validateSkuInput,
} from './ledgerEngine';
import type { PurchaseOrder, SkuItem } from '../types/ledger';

const sampleSku: SkuItem = {
  id: 'sku-1',
  ownerId: 'demo',
  code: 'KNT-101',
  name: 'Velo-D1 LiDAR Sensor',
  category: 'Sensors',
  warehouseId: 'wh-1',
  warehouseName: 'Rotterdam EU-01',
  binLocation: 'A-14-02',
  quantity: 140,
  reorderPoint: 35,
  unitCost: 210,
  unitPrice: 340,
  supplierId: 'sup-1',
  supplierName: 'Kinetix Optics GmbH',
  lotNumber: 'LOT-26-08A',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};

test('getSkuStatus evaluates in_stock, low_stock, and out_of_stock accurately', () => {
  assert.equal(getSkuStatus(140, 35, 1), 'in_stock');
  assert.equal(getSkuStatus(35, 35, 1), 'low_stock');
  assert.equal(getSkuStatus(40, 35, 1.5), 'low_stock');
  assert.equal(getSkuStatus(0, 35, 1), 'out_of_stock');
});

test('validateSkuInput rejects empty/invalid payloads and duplicate codes', () => {
  const emptyErrors = validateSkuInput(
    {
      code: '',
      name: '',
      category: '',
      warehouseId: '',
      binLocation: '',
      quantity: -5,
      reorderPoint: -1,
      unitCost: -10,
      unitPrice: 0,
      supplierId: '',
      lotNumber: '',
    },
    [sampleSku]
  );
  assert.ok(emptyErrors.code);
  assert.ok(emptyErrors.name);
  assert.ok(emptyErrors.quantity);
  assert.ok(emptyErrors.unitCost);

  const dupErrors = validateSkuInput(
    {
      code: 'knt-101',
      name: 'Duplicate Sensor',
      category: 'Sensors',
      warehouseId: 'wh-1',
      binLocation: 'B-01',
      quantity: 10,
      reorderPoint: 5,
      unitCost: 50,
      unitPrice: 80,
      supplierId: 'sup-1',
      lotNumber: 'LOT-99',
    },
    [sampleSku]
  );
  assert.match(dupErrors.code ?? '', /already exists/);
});

test('applyStockMovement updates SKU quantity and rejects overdraft', () => {
  const { updatedSkus, newMovement } = applyStockMovement(
    [sampleSku],
    {
      skuId: 'sku-1',
      type: 'outbound',
      quantity: 120,
      referenceCode: 'SO-9021',
      notes: 'Priority dispatch',
    },
    'Elena Rostova',
    '2026-11-18T08:00:00Z',
    'mov-99'
  );

  assert.equal(updatedSkus[0].quantity, 20);
  assert.equal(newMovement.quantityDelta, -120);
  assert.equal(newMovement.previousQty, 140);
  assert.equal(newMovement.newQty, 20);
  assert.equal(getSkuStatus(updatedSkus[0].quantity, updatedSkus[0].reorderPoint), 'low_stock');

  const overdraftErr = validateMovementInput(
    {
      skuId: 'sku-1',
      type: 'outbound',
      quantity: 200,
      referenceCode: 'SO-9999',
    },
    sampleSku
  );
  assert.match(overdraftErr ?? '', /Insufficient stock/);
});

test('applyOrderReceipt transitions order to received and increments SKU stock', () => {
  const po: PurchaseOrder = {
    id: 'po-1',
    ownerId: 'demo',
    orderNumber: 'PO-2026-88',
    direction: 'inbound',
    partnerName: 'Kinetix Optics GmbH',
    supplierId: 'sup-1',
    warehouseId: 'wh-1',
    warehouseName: 'Rotterdam EU-01',
    skuId: 'sku-1',
    skuCode: 'KNT-101',
    skuName: 'Velo-D1 LiDAR Sensor',
    quantity: 60,
    totalAmount: 12600,
    status: 'in_transit',
    etaDate: '2026-11-20',
    createdAt: '2026-11-10T00:00:00Z',
    updatedAt: '2026-11-10T00:00:00Z',
  };

  const result = applyOrderReceipt(
    [sampleSku],
    [po],
    'po-1',
    'Elena Rostova',
    '2026-11-18T09:00:00Z',
    'mov-po-1'
  );

  assert.equal(result.updatedOrders[0].status, 'received');
  assert.equal(result.updatedSkus[0].quantity, 200);
  assert.equal(result.newMovement?.quantityDelta, 60);
});

test('computePortfolioMetrics, category breakdown, ABC, and CSV export work accurately', () => {
  const secondSku: SkuItem = {
    ...sampleSku,
    id: 'sku-2',
    code: 'KNT-202',
    name: 'Servo Actuator',
    category: 'Motion',
    quantity: 10,
    reorderPoint: 15,
    unitCost: 100,
    unitPrice: 150,
  };

  const metrics = computePortfolioMetrics([sampleSku, secondSku], [], 1);
  assert.equal(metrics.totalCostValuation, 140 * 210 + 10 * 100);
  assert.equal(metrics.totalUnits, 150);
  assert.equal(metrics.lowStockCount, 1);

  const cats = computeCategoryBreakdown([sampleSku, secondSku]);
  assert.equal(cats[0].category, 'Sensors');

  const abc = computeAbcClassification([sampleSku, secondSku], []);
  assert.equal(abc[0].sku.code, 'KNT-101');
  assert.equal(abc[1].tier, 'C');

  const csv = buildSkusCsv([sampleSku]);
  assert.ok(csv.includes('KNT-101'));
  assert.ok(csv.includes('Velo-D1 LiDAR Sensor'));
});
