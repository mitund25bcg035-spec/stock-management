import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { buildSeedData } from '../data/seedLedger';
import type {
  PurchaseOrder,
  SkuItem,
  StockMovement,
  SupplierPartner,
  WarehouseHub,
  WorkspaceSettings,
} from '../types/ledger';
import { db, handleFirestoreError, OperationType } from './firebase';

function tsToIso(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date().toISOString();
}

function clampStr(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  return cleaned || `id-${Date.now()}`;
}

export async function ensureUserWorkspaceSeeded(user: User): Promise<WorkspaceSettings> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const seed = buildSeedData(user.uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        organizationName: String(data.organizationName || seed.settings.organizationName),
        currency: (data.currency as WorkspaceSettings['currency']) || 'USD',
        lowStockMultiplier: Number(data.lowStockMultiplier ?? 1),
        defaultWarehouseId: String(data.defaultWarehouseId || seed.settings.defaultWarehouseId),
        operatorName: String(data.displayName || user.displayName || seed.settings.operatorName),
      };
    }

    // Create parent profile document first
    await setDoc(userRef, {
      uid: user.uid,
      email: clampStr(user.email || 'operator@kineticledger.io', 254),
      displayName: clampStr(user.displayName || 'Operations Director', 120),
      organizationName: clampStr(seed.settings.organizationName, 120),
      currency: seed.settings.currency,
      lowStockMultiplier: seed.settings.lowStockMultiplier,
      defaultWarehouseId: seed.settings.defaultWarehouseId,
      seeded: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Seed initial collections in a batch
    const batch = writeBatch(db);
    for (const wh of seed.warehouses) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = wh;
      batch.set(doc(db, 'users', user.uid, 'warehouses', wh.id), {
        ...rest,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const sup of seed.suppliers) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = sup;
      batch.set(doc(db, 'users', user.uid, 'suppliers', sup.id), {
        ...rest,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const sku of seed.skus) {
      const { id: _id, createdAt: _c, updatedAt: _u, imageUrl, ...rest } = sku;
      const payload: Record<string, unknown> = {
        ...rest,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (imageUrl) payload.imageUrl = clampStr(imageUrl, 300);
      batch.set(doc(db, 'users', user.uid, 'skus', sku.id), payload);
    }
    for (const mov of seed.movements) {
      const { id: _id, createdAt: _c, targetWarehouseName, notes, ...rest } = mov;
      const payload: Record<string, unknown> = {
        ...rest,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
      };
      if (targetWarehouseName) payload.targetWarehouseName = clampStr(targetWarehouseName, 80);
      if (notes) payload.notes = clampStr(notes, 280);
      batch.set(doc(db, 'users', user.uid, 'movements', mov.id), payload);
    }
    for (const ord of seed.orders) {
      const { id: _id, createdAt: _c, updatedAt: _u, supplierId, ...rest } = ord;
      const payload: Record<string, unknown> = {
        ...rest,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (supplierId) payload.supplierId = clampStr(supplierId, 64);
      batch.set(doc(db, 'users', user.uid, 'orders', ord.id), payload);
    }
    await batch.commit();

    return {
      ...seed.settings,
      operatorName: user.displayName || seed.settings.operatorName,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export function subscribeToWorkspaceCollections(
  uid: string,
  callbacks: {
    onSkus: (skus: SkuItem[]) => void;
    onWarehouses: (warehouses: WarehouseHub[]) => void;
    onMovements: (movements: StockMovement[]) => void;
    onOrders: (orders: PurchaseOrder[]) => void;
    onSuppliers: (suppliers: SupplierPartner[]) => void;
    onSettings: (settings: Partial<WorkspaceSettings>) => void;
  }
): Unsubscribe[] {
  const unsubs: Unsubscribe[] = [];

  const profilePath = `users/${uid}`;
  unsubs.push(
    onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          callbacks.onSettings({
            organizationName: String(d.organizationName || 'Kinetic Industrial Logistics'),
            currency: (d.currency as WorkspaceSettings['currency']) || 'USD',
            lowStockMultiplier: Number(d.lowStockMultiplier ?? 1),
            defaultWarehouseId: String(d.defaultWarehouseId || 'wh-eu-rotterdam'),
            operatorName: String(d.displayName || 'Operations Director'),
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, profilePath)
    )
  );

  const skusPath = `users/${uid}/skus`;
  unsubs.push(
    onSnapshot(
      query(collection(db, skusPath), where('ownerId', '==', uid)),
      (snap) => {
        const items: SkuItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: String(data.ownerId),
            code: String(data.code),
            name: String(data.name),
            category: String(data.category),
            warehouseId: String(data.warehouseId),
            warehouseName: String(data.warehouseName),
            binLocation: String(data.binLocation),
            quantity: Number(data.quantity ?? 0),
            reorderPoint: Number(data.reorderPoint ?? 0),
            unitCost: Number(data.unitCost ?? 0),
            unitPrice: Number(data.unitPrice ?? 0),
            supplierId: String(data.supplierId),
            supplierName: String(data.supplierName),
            lotNumber: String(data.lotNumber),
            imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
            createdAt: tsToIso(data.createdAt),
            updatedAt: tsToIso(data.updatedAt),
          };
        });
        items.sort((a, b) => a.code.localeCompare(b.code));
        callbacks.onSkus(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, skusPath)
    )
  );

  const whPath = `users/${uid}/warehouses`;
  unsubs.push(
    onSnapshot(
      query(collection(db, whPath), where('ownerId', '==', uid)),
      (snap) => {
        const items: WarehouseHub[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: String(data.ownerId),
            code: String(data.code),
            name: String(data.name),
            region: String(data.region),
            address: String(data.address),
            capacityUnits: Number(data.capacityUnits ?? 1000),
            managerName: String(data.managerName),
            status: data.status as WarehouseHub['status'],
            createdAt: tsToIso(data.createdAt),
            updatedAt: tsToIso(data.updatedAt),
          };
        });
        callbacks.onWarehouses(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, whPath)
    )
  );

  const movPath = `users/${uid}/movements`;
  unsubs.push(
    onSnapshot(
      query(collection(db, movPath), where('ownerId', '==', uid)),
      (snap) => {
        const items: StockMovement[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: String(data.ownerId),
            skuId: String(data.skuId),
            skuCode: String(data.skuCode),
            skuName: String(data.skuName),
            type: data.type as StockMovement['type'],
            quantityDelta: Number(data.quantityDelta ?? 0),
            previousQty: Number(data.previousQty ?? 0),
            newQty: Number(data.newQty ?? 0),
            warehouseId: String(data.warehouseId),
            warehouseName: String(data.warehouseName),
            targetWarehouseName: data.targetWarehouseName
              ? String(data.targetWarehouseName)
              : undefined,
            referenceCode: String(data.referenceCode),
            notes: data.notes ? String(data.notes) : undefined,
            operatorName: String(data.operatorName),
            createdAt: tsToIso(data.createdAt),
          };
        });
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        callbacks.onMovements(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, movPath)
    )
  );

  const ordPath = `users/${uid}/orders`;
  unsubs.push(
    onSnapshot(
      query(collection(db, ordPath), where('ownerId', '==', uid)),
      (snap) => {
        const items: PurchaseOrder[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: String(data.ownerId),
            orderNumber: String(data.orderNumber),
            direction: data.direction as PurchaseOrder['direction'],
            partnerName: String(data.partnerName),
            supplierId: data.supplierId ? String(data.supplierId) : undefined,
            warehouseId: String(data.warehouseId),
            warehouseName: String(data.warehouseName),
            skuId: String(data.skuId),
            skuCode: String(data.skuCode),
            skuName: String(data.skuName),
            quantity: Number(data.quantity ?? 0),
            totalAmount: Number(data.totalAmount ?? 0),
            status: data.status as PurchaseOrder['status'],
            etaDate: String(data.etaDate),
            createdAt: tsToIso(data.createdAt),
            updatedAt: tsToIso(data.updatedAt),
          };
        });
        items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        callbacks.onOrders(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, ordPath)
    )
  );

  const supPath = `users/${uid}/suppliers`;
  unsubs.push(
    onSnapshot(
      query(collection(db, supPath), where('ownerId', '==', uid)),
      (snap) => {
        const items: SupplierPartner[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: String(data.ownerId),
            name: String(data.name),
            code: String(data.code),
            region: String(data.region),
            contactEmail: String(data.contactEmail),
            leadTimeDays: Number(data.leadTimeDays ?? 7),
            onTimeRate: Number(data.onTimeRate ?? 95),
            activeCategory: String(data.activeCategory),
            status: data.status as SupplierPartner['status'],
            createdAt: tsToIso(data.createdAt),
            updatedAt: tsToIso(data.updatedAt),
          };
        });
        callbacks.onSuppliers(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, supPath)
    )
  );

  return unsubs;
}

export async function fsSaveSku(uid: string, sku: SkuItem, isCreate: boolean): Promise<void> {
  const id = sanitizeId(sku.id);
  const path = `users/${uid}/skus/${id}`;
  try {
    const ref = doc(db, 'users', uid, 'skus', id);
    const payload: Record<string, unknown> = {
      code: clampStr(sku.code.toUpperCase(), 32),
      name: clampStr(sku.name, 120),
      category: clampStr(sku.category, 48),
      warehouseId: clampStr(sku.warehouseId, 64),
      warehouseName: clampStr(sku.warehouseName, 80),
      binLocation: clampStr(sku.binLocation, 32),
      quantity: Math.max(0, Math.round(sku.quantity)),
      reorderPoint: Math.max(0, Math.round(sku.reorderPoint)),
      unitCost: Math.max(0, Number(sku.unitCost)),
      unitPrice: Math.max(0, Number(sku.unitPrice)),
      supplierId: clampStr(sku.supplierId, 64),
      supplierName: clampStr(sku.supplierName, 100),
      lotNumber: clampStr(sku.lotNumber, 48),
      updatedAt: serverTimestamp(),
    };
    if (sku.imageUrl) {
      payload.imageUrl = clampStr(sku.imageUrl, 300);
    }
    if (isCreate) {
      payload.ownerId = uid;
      payload.createdAt = serverTimestamp();
      await setDoc(ref, payload);
    } else {
      await updateDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, isCreate ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function fsDeleteSku(uid: string, skuId: string): Promise<void> {
  const id = sanitizeId(skuId);
  const path = `users/${uid}/skus/${id}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'skus', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fsCommitMovementAndSku(
  uid: string,
  skuId: string,
  newQuantity: number,
  movement: StockMovement
): Promise<void> {
  const cleanSkuId = sanitizeId(skuId);
  const cleanMovId = sanitizeId(movement.id);
  const path = `users/${uid}/movements/${cleanMovId}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid, 'skus', cleanSkuId), {
      quantity: Math.max(0, Math.round(newQuantity)),
      updatedAt: serverTimestamp(),
    });
    const movPayload: Record<string, unknown> = {
      ownerId: uid,
      skuId: clampStr(movement.skuId, 64),
      skuCode: clampStr(movement.skuCode, 32),
      skuName: clampStr(movement.skuName, 120),
      type: movement.type,
      quantityDelta: movement.quantityDelta,
      previousQty: movement.previousQty,
      newQty: movement.newQty,
      warehouseId: clampStr(movement.warehouseId, 64),
      warehouseName: clampStr(movement.warehouseName, 80),
      referenceCode: clampStr(movement.referenceCode, 48),
      operatorName: clampStr(movement.operatorName, 80),
      createdAt: serverTimestamp(),
    };
    if (movement.targetWarehouseName) {
      movPayload.targetWarehouseName = clampStr(movement.targetWarehouseName, 80);
    }
    if (movement.notes) {
      movPayload.notes = clampStr(movement.notes, 280);
    }
    batch.set(doc(db, 'users', uid, 'movements', cleanMovId), movPayload);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fsCreateWarehouse(uid: string, warehouse: WarehouseHub): Promise<void> {
  const id = sanitizeId(warehouse.id);
  const path = `users/${uid}/warehouses/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'warehouses', id), {
      ownerId: uid,
      code: clampStr(warehouse.code, 24),
      name: clampStr(warehouse.name, 100),
      region: clampStr(warehouse.region, 64),
      address: clampStr(warehouse.address, 160),
      capacityUnits: Math.max(1, Math.round(warehouse.capacityUnits)),
      managerName: clampStr(warehouse.managerName, 80),
      status: warehouse.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fsCreateOrder(uid: string, order: PurchaseOrder): Promise<void> {
  const id = sanitizeId(order.id);
  const path = `users/${uid}/orders/${id}`;
  try {
    const payload: Record<string, unknown> = {
      ownerId: uid,
      orderNumber: clampStr(order.orderNumber, 32),
      direction: order.direction,
      partnerName: clampStr(order.partnerName, 100),
      warehouseId: clampStr(order.warehouseId, 64),
      warehouseName: clampStr(order.warehouseName, 80),
      skuId: clampStr(order.skuId, 64),
      skuCode: clampStr(order.skuCode, 32),
      skuName: clampStr(order.skuName, 120),
      quantity: Math.max(1, Math.round(order.quantity)),
      totalAmount: Math.max(0, Number(order.totalAmount)),
      status: order.status,
      etaDate: clampStr(order.etaDate, 32),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (order.supplierId) payload.supplierId = clampStr(order.supplierId, 64);
    await setDoc(doc(db, 'users', uid, 'orders', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fsUpdateOrderStatus(
  uid: string,
  orderId: string,
  status: PurchaseOrder['status']
): Promise<void> {
  const id = sanitizeId(orderId);
  const path = `users/${uid}/orders/${id}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'orders', id), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fsReceiveOrderAtomic(
  uid: string,
  orderId: string,
  skuId: string | null,
  newQuantity: number,
  movement: StockMovement | null
): Promise<void> {
  const cleanOrderId = sanitizeId(orderId);
  const path = `users/${uid}/orders/${cleanOrderId}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', uid, 'orders', cleanOrderId), {
      status: 'received',
      updatedAt: serverTimestamp(),
    });
    if (skuId && movement) {
      batch.update(doc(db, 'users', uid, 'skus', sanitizeId(skuId)), {
        quantity: Math.max(0, Math.round(newQuantity)),
        updatedAt: serverTimestamp(),
      });
      const movPayload: Record<string, unknown> = {
        ownerId: uid,
        skuId: clampStr(movement.skuId, 64),
        skuCode: clampStr(movement.skuCode, 32),
        skuName: clampStr(movement.skuName, 120),
        type: movement.type,
        quantityDelta: movement.quantityDelta,
        previousQty: movement.previousQty,
        newQty: movement.newQty,
        warehouseId: clampStr(movement.warehouseId, 64),
        warehouseName: clampStr(movement.warehouseName, 80),
        referenceCode: clampStr(movement.referenceCode, 48),
        operatorName: clampStr(movement.operatorName, 80),
        createdAt: serverTimestamp(),
      };
      if (movement.notes) movPayload.notes = clampStr(movement.notes, 280);
      batch.set(doc(db, 'users', uid, 'movements', sanitizeId(movement.id)), movPayload);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fsCreateSupplier(uid: string, supplier: SupplierPartner): Promise<void> {
  const id = sanitizeId(supplier.id);
  const path = `users/${uid}/suppliers/${id}`;
  try {
    await setDoc(doc(db, 'users', uid, 'suppliers', id), {
      ownerId: uid,
      name: clampStr(supplier.name, 100),
      code: clampStr(supplier.code, 24),
      region: clampStr(supplier.region, 64),
      contactEmail: clampStr(supplier.contactEmail, 120),
      leadTimeDays: Math.max(1, Math.round(supplier.leadTimeDays)),
      onTimeRate: Math.min(100, Math.max(0, Number(supplier.onTimeRate))),
      activeCategory: clampStr(supplier.activeCategory, 48),
      status: supplier.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fsUpdateSettings(uid: string, settings: WorkspaceSettings): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      organizationName: clampStr(settings.organizationName, 120),
      currency: settings.currency,
      lowStockMultiplier: settings.lowStockMultiplier,
      defaultWarehouseId: clampStr(settings.defaultWarehouseId, 64),
      displayName: clampStr(settings.operatorName, 120),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fsResetWorkspaceToSeed(user: User): Promise<void> {
  const uid = user.uid;
  const subCollections = ['skus', 'warehouses', 'movements', 'orders', 'suppliers'] as const;
  try {
    for (const sub of subCollections) {
      if (sub === 'movements') continue; // movements are immutable by security rules
      const snap = await getDocs(query(collection(db, 'users', uid, sub), where('ownerId', '==', uid)));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    const seed = buildSeedData(uid);
    const batch = writeBatch(db);
    for (const wh of seed.warehouses) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = wh;
      batch.set(doc(db, 'users', uid, 'warehouses', wh.id), {
        ...rest,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const sup of seed.suppliers) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = sup;
      batch.set(doc(db, 'users', uid, 'suppliers', sup.id), {
        ...rest,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const sku of seed.skus) {
      const { id: _id, createdAt: _c, updatedAt: _u, imageUrl, ...rest } = sku;
      const payload: Record<string, unknown> = {
        ...rest,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (imageUrl) payload.imageUrl = clampStr(imageUrl, 300);
      batch.set(doc(db, 'users', uid, 'skus', sku.id), payload);
    }
    for (const ord of seed.orders) {
      const { id: _id, createdAt: _c, updatedAt: _u, supplierId, ...rest } = ord;
      const payload: Record<string, unknown> = {
        ...rest,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (supplierId) payload.supplierId = clampStr(supplierId, 64);
      batch.set(doc(db, 'users', uid, 'orders', ord.id), payload);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}
