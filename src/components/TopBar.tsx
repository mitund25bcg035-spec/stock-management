import { Cloud, CloudOff, Menu, Plus, Search } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import type { ScreenId } from '../types/ledger';

const SCREEN_TITLES: Record<ScreenId, string> = {
  overview: 'Executive Overview',
  inventory: 'Inventory Catalog',
  movements: 'Stock Movements Ledger',
  warehouses: 'Warehouse Network',
  orders: 'Purchase & Dispatch Orders',
  suppliers: 'Suppliers & SLA Directory',
  analytics: 'Forecasting & Valuation',
  settings: 'Workspace & Cloud Sync',
};

interface TopBarProps {
  activeScreen: ScreenId;
  globalSearch: string;
  onGlobalSearchChange: (val: string) => void;
  onSearchSubmit: () => void;
  onOpenMobileNav: () => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
}

export function TopBar({
  activeScreen,
  globalSearch,
  onGlobalSearchChange,
  onSearchSubmit,
  onOpenMobileNav,
  onPrimaryAction,
  primaryActionLabel,
}: TopBarProps) {
  const { user, cloudSyncing, settings, signInWithGoogle } = useLedger();

  return (
    <header className="h-16 bg-white border-b border-[#E2E8E4] px-4 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Left: Mobile Menu Trigger + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="md:hidden w-9 h-9 rounded-lg border border-[#E2E8E4] flex items-center justify-center text-[#17211E] hover:bg-[#F5F7F3] transition-colors cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-[#7C8982] whitespace-nowrap">
            <span className="truncate max-w-[160px] sm:max-w-none">
              {settings.organizationName}
            </span>
            <span aria-hidden="true">/</span>
            <span className="text-[#17211E] font-semibold truncate">
              {SCREEN_TITLES[activeScreen]}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Search + Cloud Sync Indicator + Primary CTA */}
      <div className="flex items-center gap-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit();
          }}
          className="hidden sm:flex items-center relative"
        >
          <Search className="w-4 h-4 text-[#7C8982] absolute left-3 pointer-events-none" />
          <input
            type="search"
            value={globalSearch}
            onChange={(e) => onGlobalSearchChange(e.target.value)}
            placeholder="Search SKU or item..."
            aria-label="Search SKU or item"
            className="h-9 w-48 lg:w-64 pl-9 pr-3 rounded-lg bg-[#F5F7F3] border border-[#E2E8E4] text-sm text-[#17211E] placeholder:text-[#7C8982] focus:bg-white focus:border-[#14211D] focus:outline-none focus:ring-1 focus:ring-[#14211D] transition-colors"
          />
        </form>

        <button
          type="button"
          onClick={() => {
            if (!user) void signInWithGoogle();
          }}
          title={user ? `Synced as ${user.email}` : 'Click to sync workspace with Google Cloud'}
          className={`hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            user
              ? 'border-[#B6D8C9] bg-[#B6D8C9]/20 text-[#0E4331]'
              : 'border-[#E2E8E4] bg-white text-[#434846] hover:bg-[#F5F7F3] cursor-pointer'
          }`}
        >
          {user ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-[#28815F]" />
              <span>{cloudSyncing ? 'Syncing...' : 'Cloud Synced'}</span>
            </>
          ) : (
            <>
              <CloudOff className="w-3.5 h-3.5 text-[#7C8982]" />
              <span>Local Mode</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onPrimaryAction}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#C7E78B] hover:bg-[#B8DC7A] active:scale-[0.98] text-[#14211D] text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14211D]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>{primaryActionLabel}</span>
        </button>
      </div>
    </header>
  );
}
