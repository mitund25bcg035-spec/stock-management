import { useMemo, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InventoryScreen } from './components/InventoryScreen';
import { MovementModal } from './components/MovementModal';
import { MovementsScreen } from './components/MovementsScreen';
import { OrdersScreen } from './components/OrdersScreen';
import { OverviewScreen } from './components/OverviewScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { SidebarRail } from './components/SidebarRail';
import { SkuDetailDrawer } from './components/SkuDetailDrawer';
import { SkuModal } from './components/SkuModal';
import { SuppliersScreen } from './components/SuppliersScreen';
import { TopBar } from './components/TopBar';
import { WarehousesScreen } from './components/WarehousesScreen';
import { LedgerProvider, useLedger } from './context/LedgerContext';
import type { MovementType, ScreenId, SkuItem } from './types/ledger';

function KineticLedgerShell() {
  const { skus, toast, dismissToast } = useLedger();

  const [activeScreen, setActiveScreen] = useState<ScreenId>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Modal & Drawer state
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<SkuItem | null>(null);
  const [inspectedSkuId, setInspectedSkuId] = useState<string | null>(null);

  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementSkuId, setMovementSkuId] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<MovementType>('inbound');

  const [orderModalExternalOpen, setOrderModalExternalOpen] = useState(false);

  const inspectedSku = useMemo(
    () => (inspectedSkuId ? skus.find((s) => s.id === inspectedSkuId) || null : null),
    [inspectedSkuId, skus]
  );

  const primaryActionLabel = useMemo(() => {
    switch (activeScreen) {
      case 'movements':
        return 'Log Movement';
      case 'orders':
        return 'Create Order';
      default:
        return 'Add SKU';
    }
  }, [activeScreen]);

  const handlePrimaryAction = () => {
    if (activeScreen === 'movements') {
      setMovementSkuId(null);
      setMovementType('inbound');
      setMovementModalOpen(true);
    } else if (activeScreen === 'orders') {
      setOrderModalExternalOpen(true);
    } else {
      setEditingSku(null);
      setSkuModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F5F7F3] text-[#17211E]">
      <SidebarRail
        activeScreen={activeScreen}
        onSelectScreen={setActiveScreen}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeScreen={activeScreen}
          globalSearch={globalSearch}
          onGlobalSearchChange={(val) => {
            setGlobalSearch(val);
            if (val.trim() && activeScreen !== 'inventory') {
              setActiveScreen('inventory');
            }
          }}
          onSearchSubmit={() => setActiveScreen('inventory')}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onPrimaryAction={handlePrimaryAction}
          primaryActionLabel={primaryActionLabel}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1480px] w-full mx-auto">
          {activeScreen === 'overview' && (
            <OverviewScreen
              onNavigate={setActiveScreen}
              onInspectSku={(sku) => setInspectedSkuId(sku.id)}
              onQuickRestock={(sku) => {
                setMovementSkuId(sku.id);
                setMovementType('inbound');
                setMovementModalOpen(true);
              }}
            />
          )}

          {activeScreen === 'inventory' && (
            <InventoryScreen
              searchQuery={globalSearch}
              onSearchChange={setGlobalSearch}
              onAddSku={() => {
                setEditingSku(null);
                setSkuModalOpen(true);
              }}
              onEditSku={(sku) => {
                setEditingSku(sku);
                setSkuModalOpen(true);
              }}
              onInspectSku={(sku) => setInspectedSkuId(sku.id)}
            />
          )}

          {activeScreen === 'movements' && <MovementsScreen />}

          {activeScreen === 'warehouses' && (
            <WarehousesScreen
              onInitiateTransfer={() => {
                setMovementSkuId(skus[0]?.id || null);
                setMovementType('transfer');
                setMovementModalOpen(true);
              }}
            />
          )}

          {activeScreen === 'orders' && (
            <OrdersScreen
              externalModalOpen={orderModalExternalOpen}
              onCloseExternalModal={() => setOrderModalExternalOpen(false)}
            />
          )}

          {activeScreen === 'suppliers' && <SuppliersScreen />}

          {activeScreen === 'analytics' && (
            <AnalyticsScreen onInspectSku={(sku) => setInspectedSkuId(sku.id)} />
          )}

          {activeScreen === 'settings' && <SettingsScreen />}
        </main>
      </div>

      {/* Drawers & Modals */}
      <SkuDetailDrawer
        sku={inspectedSku}
        onClose={() => setInspectedSkuId(null)}
        onEdit={(sku) => {
          setEditingSku(sku);
          setSkuModalOpen(true);
        }}
        onLogMovement={(sku, type) => {
          setMovementSkuId(sku.id);
          setMovementType(type);
          setMovementModalOpen(true);
        }}
      />

      <SkuModal
        open={skuModalOpen}
        editingSku={editingSku}
        onClose={() => setSkuModalOpen(false)}
      />

      <MovementModal
        open={movementModalOpen}
        preselectedSkuId={movementSkuId}
        preselectedType={movementType}
        onClose={() => setMovementModalOpen(false)}
      />

      {/* Non-intrusive Operational Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 popover-surface rounded-xl px-4 py-3 flex items-center gap-3 max-w-sm"
        >
          <CheckCircle2
            className={`w-4 h-4 shrink-0 ${
              toast.tone === 'error'
                ? 'text-[#C24C2C]'
                : toast.tone === 'warning'
                  ? 'text-[#732B1A]'
                  : 'text-[#28815F]'
            }`}
          />
          <span className="text-xs font-semibold text-[#17211E]">{toast.message}</span>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss notification"
            className="text-[#7C8982] hover:text-[#17211E] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LedgerProvider>
        <KineticLedgerShell />
      </LedgerProvider>
    </ErrorBoundary>
  );
}
