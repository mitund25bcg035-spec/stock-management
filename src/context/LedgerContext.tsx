import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { buildSeedData, type SeedLedgerBundle } from '../data/seedLedger';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  ensureUserWorkspaceSeeded,
  fsCommitMovementAndSku,
  fsCreateOrder,
  fsCreateSupplier,
  fsCreateWarehouse,
  fsDeleteSku,
  fsReceiveOrderAtomic,
  fsResetWorkspaceToSeed,
  fsSaveSku,
  fsUpdateOrderStatus,
  fsUpdateSettings,
  subscribeToWorkspaceCollections,
} from '../lib/firestoreStore';
import type {
  PurchaseOrder,
  SkuItem,
  StockMovement,
  SupplierPartner,
  WarehouseHub,
  WorkspaceSettings,
} from '../types/ledger';
import {
  applyOrderReceipt,
  applyStockMovement,
  buildSkusCsv,
  type MovementInputPayload,
  type SkuInputPayload,
  validateSkuInput,
} from '../utils/ledgerEngine';

const STORAGE_KEY = 'kinetic_ledger_workspace_v1';

function loadLocalBundle(): SeedLedgerBundle {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SeedLedgerBundle;
      if (parsed && Array.isArray(parsed.skus) && Array.isArray(parsed.warehouses)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to clean seed bundle
  }
  return buildSeedData('local-workspace');
}

function saveLocalBundle(bundle: SeedLedgerBundle): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  } catch {
    // Ignore quota errors in private browsing
  }
}

export interface ToastNotice {
  id: string;
  message: string;
  tone: 'success' | 'warning' | 'error';
}

interface LedgerContextValue {
  user: User | null;
  authReady: boolean;
  cloudSyncing: boolean;
  authError: string | null;
  skus: SkuItem[];
  warehouses: WarehouseHub[];
  movements: StockMovement[];
  orders: PurchaseOrder[];
  suppliers: SupplierPartner[];
  settings: WorkspaceSettings;
  toast: ToastNotice | null;
  dismissToast: () => void;
  notify: (message: string, tone?: ToastNotice['tone']) => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  createSku: (payload: SkuInputPayload) => Promise<{ ok: boolean; error?: string }>;
  updateSku: (id: string, payload: SkuInputPayload) => Promise<{ ok: boolean; error?: string }>;
  deleteSku: (id: string) => Promise<void>;
  bulkDeleteSkus: (ids: string[]) => Promise<void>;
  recordMovement: (payload: MovementInputPayload) => Promise<{ ok: boolean; error?: string }>;
  createWarehouse: (payload: {
    code: string;
    name: string;
    region: string;
    address: string;
    capacityUnits: number;
    managerName: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  createOrder: (payload: {
    orderNumber: string;
    direction: 'inbound' | 'outbound';
    partnerName: string;
    supplierId?: string;
    warehouseId: string;
    skuId: string;
    quantity: number;
    etaDate: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  advanceOrderStatus: (orderId: string, status: PurchaseOrder['status']) => Promise<void>;
  receiveOrder: (orderId: string) => Promise<{ ok: boolean; error?: string }>;
  createSupplier: (payload: {
    name: string;
    code: string;
    region: string;
    contactEmail: string;
    leadTimeDays: number;
    activeCategory: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateSettings: (next: WorkspaceSettings) => Promise<void>;
  resetWorkspaceToSeed: () => Promise<void>;
  exportSkusCsv: (subset?: SkuItem[]) => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const [initial] = useState<SeedLedgerBundle>(() => loadLocalBundle());

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [skus, setSkus] = useState<SkuItem[]>(initial.skus);
  const [warehouses, setWarehouses] = useState<WarehouseHub[]>(initial.warehouses);
  const [movements, setMovements] = useState<StockMovement[]>(initial.movements);
  const [orders, setOrders] = useState<PurchaseOrder[]>(initial.orders);
  const [suppliers, setSuppliers] = useState<SupplierPartner[]>(initial.suppliers);
  const [settings, setSettings] = useState<WorkspaceSettings>(initial.settings);
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const notify = useCallback((message: string, tone: ToastNotice['tone'] = 'success') => {
    setToast({ id: `${Date.now()}`, message, tone });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Persist local workspace whenever not signed in
  useEffect(() => {
    if (!user) {
      saveLocalBundle({ settings, warehouses, suppliers, skus, movements, orders });
    }
  }, [user, settings, warehouses, suppliers, skus, movements, orders]);

  // Listen to Firebase Auth state and attach Firestore listeners when signed in
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      unsubs.forEach((fn) => fn());
      unsubs = [];
      setUser(nextUser);
      setAuthReady(true);

      if (nextUser) {
        setCloudSyncing(true);
        try {
          const cloudSettings = await ensureUserWorkspaceSeeded(nextUser);
          setSettings(cloudSettings);
          unsubs = subscribeToWorkspaceCollections(nextUser.uid, {
            onSkus: (data) => setSkus(data),
            onWarehouses: (data) => setWarehouses(data),
            onMovements: (data) => setMovements(data),
            onOrders: (data) => setOrders(data),
            onSuppliers: (data) => setSuppliers(data),
            onSettings: (partial) => setSettings((prev) => ({ ...prev, ...partial })),
          });
        } catch (err) {
          setAuthError(err instanceof Error ? err.message : 'Unable to initialize cloud sync.');
        } finally {
          setCloudSyncing(false);
        }
      } else {
        const local = loadLocalBundle();
        setSkus(local.skus);
        setWarehouses(local.warehouses);
        setMovements(local.movements);
        setOrders(local.orders);
        setSuppliers(local.suppliers);
        setSettings(local.settings);
      }
    });

    return () => {
      unsubAuth();
      unsubs.forEach((fn) => fn());
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      notify('Connected to Firebase Cloud Ledger');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setAuthError(msg);
      notify('Google Sign-In cancelled or blocked by popup blocker.', 'warning');
    }
  }, [notify]);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    notify('Switched to local browser workspace');
  }, [notify]);

  const createSku = useCallback(
    async (payload: SkuInputPayload) => {
      const errors = validateSkuInput(payload, skus);
      const firstError = Object.values(errors)[0];
      if (firstError) return { ok: false, error: firstError };

      const warehouse = warehouses.find((w) => w.id === payload.warehouseId);
      const supplier = suppliers.find((s) => s.id === payload.supplierId);
      if (!warehouse || !supplier) {
        return { ok: false, error: 'Selected warehouse or supplier is invalid.' };
      }

      const nowIso = new Date().toISOString();
      const id = `sku-${Date.now()}`;
      const newSku: SkuItem = {
        id,
        ownerId: user?.uid || 'local-workspace',
        code: payload.code.trim().toUpperCase(),
        name: payload.name.trim(),
        category: payload.category.trim(),
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        binLocation: payload.binLocation.trim().toUpperCase(),
        quantity: Math.max(0, Math.round(payload.quantity)),
        reorderPoint: Math.max(0, Math.round(payload.reorderPoint)),
        unitCost: Number(payload.unitCost),
        unitPrice: Number(payload.unitPrice),
        supplierId: supplier.id,
        supplierName: supplier.name,
        lotNumber: payload.lotNumber.trim().toUpperCase(),
        imageUrl: payload.imageUrl?.trim() || undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      if (user) {
        await fsSaveSku(user.uid, newSku, true);
      } else {
        setSkus((prev) => [...prev, newSku].sort((a, b) => a.code.localeCompare(b.code)));
      }
      notify(`Added SKU ${newSku.code} — ${newSku.name}`);
      return { ok: true };
    },
    [skus, warehouses, suppliers, user, notify]
  );

  const updateSku = useCallback(
    async (id: string, payload: SkuInputPayload) => {
      const errors = validateSkuInput(payload, skus, id);
      const firstError = Object.values(errors)[0];
      if (firstError) return { ok: false, error: firstError };

      const existing = skus.find((s) => s.id === id);
      const warehouse = warehouses.find((w) => w.id === payload.warehouseId);
      const supplier = suppliers.find((s) => s.id === payload.supplierId);
      if (!existing || !warehouse || !supplier) {
        return { ok: false, error: 'SKU, warehouse, or supplier not found.' };
      }

      const updated: SkuItem = {
        ...existing,
        code: payload.code.trim().toUpperCase(),
        name: payload.name.trim(),
        category: payload.category.trim(),
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        binLocation: payload.binLocation.trim().toUpperCase(),
        quantity: Math.max(0, Math.round(payload.quantity)),
        reorderPoint: Math.max(0, Math.round(payload.reorderPoint)),
        unitCost: Number(payload.unitCost),
        unitPrice: Number(payload.unitPrice),
        supplierId: supplier.id,
        supplierName: supplier.name,
        lotNumber: payload.lotNumber.trim().toUpperCase(),
        imageUrl: payload.imageUrl?.trim() || existing.imageUrl,
        updatedAt: new Date().toISOString(),
      };

      if (user) {
        await fsSaveSku(user.uid, updated, false);
      } else {
        setSkus((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
      notify(`Updated ${updated.code}`);
      return { ok: true };
    },
    [skus, warehouses, suppliers, user, notify]
  );

  const deleteSku = useCallback(
    async (id: string) => {
      const target = skus.find((s) => s.id === id);
      if (user) {
        await fsDeleteSku(user.uid, id);
      } else {
        setSkus((prev) => prev.filter((s) => s.id !== id));
      }
      notify(`Removed ${target?.code || 'SKU'} from catalog`, 'warning');
    },
    [skus, user, notify]
  );

  const bulkDeleteSkus = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      if (user) {
        await Promise.all(ids.map((id) => fsDeleteSku(user.uid, id)));
      } else {
        const idSet = new Set(ids);
        setSkus((prev) => prev.filter((s) => !idSet.has(s.id)));
      }
      notify(`Removed ${ids.length} selected SKU(s)`, 'warning');
    },
    [user, notify]
  );

  const recordMovement = useCallback(
    async (payload: MovementInputPayload) => {
      try {
        const nowIso = new Date().toISOString();
        const movId = `mov-${Date.now()}`;
        const { updatedSkus, newMovement } = applyStockMovement(
          skus,
          payload,
          settings.operatorName,
          nowIso,
          movId
        );
        const updatedSku = updatedSkus.find((s) => s.id === payload.skuId);
        if (!updatedSku) return { ok: false, error: 'SKU not found.' };

        if (user) {
          await fsCommitMovementAndSku(user.uid, updatedSku.id, updatedSku.quantity, {
            ...newMovement,
            ownerId: user.uid,
          });
        } else {
          setSkus(updatedSkus);
          setMovements((prev) => [newMovement, ...prev]);
        }

        const sign = newMovement.quantityDelta >= 0 ? `+${newMovement.quantityDelta}` : `${newMovement.quantityDelta}`;
        notify(`${newMovement.skuCode} adjusted (${sign} units · ${newMovement.referenceCode})`);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Unable to record movement.' };
      }
    },
    [skus, settings.operatorName, user, notify]
  );

  const createWarehouse = useCallback(
    async (payload: {
      code: string;
      name: string;
      region: string;
      address: string;
      capacityUnits: number;
      managerName: string;
    }) => {
      if (!payload.code.trim() || !payload.name.trim() || !payload.region.trim() || !payload.address.trim() || !payload.managerName.trim()) {
        return { ok: false, error: 'All warehouse fields are required.' };
      }
      if (!Number.isFinite(payload.capacityUnits) || payload.capacityUnits < 100) {
        return { ok: false, error: 'Capacity must be at least 100 units.' };
      }
      const nowIso = new Date().toISOString();
      const wh: WarehouseHub = {
        id: `wh-${Date.now()}`,
        ownerId: user?.uid || 'local-workspace',
        code: payload.code.trim().toUpperCase(),
        name: payload.name.trim(),
        region: payload.region.trim(),
        address: payload.address.trim(),
        capacityUnits: Math.round(payload.capacityUnits),
        managerName: payload.managerName.trim(),
        status: 'operational',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      if (user) {
        await fsCreateWarehouse(user.uid, wh);
      } else {
        setWarehouses((prev) => [...prev, wh]);
      }
      notify(`Registered hub ${wh.code} — ${wh.name}`);
      return { ok: true };
    },
    [user, notify]
  );

  const createOrder = useCallback(
    async (payload: {
      orderNumber: string;
      direction: 'inbound' | 'outbound';
      partnerName: string;
      supplierId?: string;
      warehouseId: string;
      skuId: string;
      quantity: number;
      etaDate: string;
    }) => {
      const sku = skus.find((s) => s.id === payload.skuId);
      const warehouse = warehouses.find((w) => w.id === payload.warehouseId);
      if (!sku || !warehouse) {
        return { ok: false, error: 'Select a valid SKU and warehouse hub.' };
      }
      if (!payload.orderNumber.trim() || !payload.partnerName.trim() || !payload.etaDate.trim()) {
        return { ok: false, error: 'Order number, partner name, and ETA date are required.' };
      }
      if (!Number.isFinite(payload.quantity) || payload.quantity < 1) {
        return { ok: false, error: 'Quantity must be at least 1 unit.' };
      }

      const nowIso = new Date().toISOString();
      const qty = Math.round(payload.quantity);
      const unitVal = payload.direction === 'inbound' ? sku.unitCost : sku.unitPrice;
      const newOrder: PurchaseOrder = {
        id: `ord-${Date.now()}`,
        ownerId: user?.uid || 'local-workspace',
        orderNumber: payload.orderNumber.trim().toUpperCase(),
        direction: payload.direction,
        partnerName: payload.partnerName.trim(),
        supplierId: payload.supplierId,
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        skuId: sku.id,
        skuCode: sku.code,
        skuName: sku.name,
        quantity: qty,
        totalAmount: Number((qty * unitVal).toFixed(2)),
        status: 'ordered',
        etaDate: payload.etaDate.trim(),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      if (user) {
        await fsCreateOrder(user.uid, newOrder);
      } else {
        setOrders((prev) => [newOrder, ...prev]);
      }
      notify(`Created ${newOrder.orderNumber} (${qty} units of ${sku.code})`);
      return { ok: true };
    },
    [skus, warehouses, user, notify]
  );

  const advanceOrderStatus = useCallback(
    async (orderId: string, status: PurchaseOrder['status']) => {
      if (user) {
        await fsUpdateOrderStatus(user.uid, orderId, status);
      } else {
        const nowIso = new Date().toISOString();
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status, updatedAt: nowIso } : o))
        );
      }
      notify(`Order updated to ${status.replace('_', ' ')}`);
    },
    [user, notify]
  );

  const receiveOrder = useCallback(
    async (orderId: string) => {
      try {
        const nowIso = new Date().toISOString();
        const movId = `mov-ord-${Date.now()}`;
        const { updatedOrders, updatedSkus, newMovement } = applyOrderReceipt(
          skus,
          orders,
          orderId,
          settings.operatorName,
          nowIso,
          movId
        );

        const targetOrder = updatedOrders.find((o) => o.id === orderId);
        const affectedSku = targetOrder ? updatedSkus.find((s) => s.id === targetOrder.skuId) : null;

        if (user) {
          await fsReceiveOrderAtomic(
            user.uid,
            orderId,
            affectedSku ? affectedSku.id : null,
            affectedSku ? affectedSku.quantity : 0,
            newMovement ? { ...newMovement, ownerId: user.uid } : null
          );
        } else {
          setOrders(updatedOrders);
          setSkus(updatedSkus);
          if (newMovement) {
            setMovements((prev) => [newMovement, ...prev]);
          }
        }
        notify(`${targetOrder?.orderNumber || 'Order'} fulfilled and ledger updated`);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Unable to process order.' };
      }
    },
    [skus, orders, settings.operatorName, user, notify]
  );

  const createSupplier = useCallback(
    async (payload: {
      name: string;
      code: string;
      region: string;
      contactEmail: string;
      leadTimeDays: number;
      activeCategory: string;
    }) => {
      if (!payload.name.trim() || !payload.code.trim() || !payload.region.trim() || !payload.contactEmail.includes('@')) {
        return { ok: false, error: 'Provide valid supplier name, code, region, and email.' };
      }
      const nowIso = new Date().toISOString();
      const supplier: SupplierPartner = {
        id: `sup-${Date.now()}`,
        ownerId: user?.uid || 'local-workspace',
        name: payload.name.trim(),
        code: payload.code.trim().toUpperCase(),
        region: payload.region.trim(),
        contactEmail: payload.contactEmail.trim(),
        leadTimeDays: Math.max(1, Math.round(payload.leadTimeDays || 7)),
        onTimeRate: 96.0,
        activeCategory: payload.activeCategory.trim() || 'Sensors',
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      if (user) {
        await fsCreateSupplier(user.uid, supplier);
      } else {
        setSuppliers((prev) => [...prev, supplier]);
      }
      notify(`Onboarded supplier ${supplier.name}`);
      return { ok: true };
    },
    [user, notify]
  );

  const updateSettings = useCallback(
    async (next: WorkspaceSettings) => {
      setSettings(next);
      if (user) {
        await fsUpdateSettings(user.uid, next);
      }
      notify('Workspace settings saved');
    },
    [user, notify]
  );

  const resetWorkspaceToSeed = useCallback(async () => {
    if (user) {
      setCloudSyncing(true);
      try {
        await fsResetWorkspaceToSeed(user);
        notify('Cloud workspace reset to baseline dataset');
      } finally {
        setCloudSyncing(false);
      }
    } else {
      const seed = buildSeedData('local-workspace');
      setSkus(seed.skus);
      setWarehouses(seed.warehouses);
      setMovements(seed.movements);
      setOrders(seed.orders);
      setSuppliers(seed.suppliers);
      setSettings(seed.settings);
      saveLocalBundle(seed);
      notify('Local workspace restored to baseline dataset');
    }
  }, [user, notify]);

  const exportSkusCsv = useCallback(
    (subset?: SkuItem[]) => {
      const csv = buildSkusCsv(subset && subset.length > 0 ? subset : skus);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kinetic-ledger-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify(`Exported ${(subset && subset.length > 0 ? subset : skus).length} SKU records to CSV`);
    },
    [skus, notify]
  );

  return (
    <LedgerContext.Provider
      value={{
        user,
        authReady,
        cloudSyncing,
        authError,
        skus,
        warehouses,
        movements,
        orders,
        suppliers,
        settings,
        toast,
        dismissToast,
        notify,
        signInWithGoogle,
        signOutUser,
        createSku,
        updateSku,
        deleteSku,
        bulkDeleteSkus,
        recordMovement,
        createWarehouse,
        createOrder,
        advanceOrderStatus,
        receiveOrder,
        createSupplier,
        updateSettings,
        resetWorkspaceToSeed,
        exportSkusCsv,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
}

export function useLedger(): LedgerContextValue {
  const ctx = useContext(LedgerContext);
  if (!ctx) {
    throw new Error('useLedger must be used inside LedgerProvider');
  }
  return ctx;
}
