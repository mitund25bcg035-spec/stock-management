import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogIn,
  LogOut,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { OPERATOR_AVATAR_URL } from '../data/seedLedger';
import { useLedger } from '../context/LedgerContext';
import type { ScreenId } from '../types/ledger';

interface NavItem {
  id: ScreenId;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory Catalog', icon: Boxes },
  { id: 'movements', label: 'Stock Movements', icon: ArrowLeftRight },
  { id: 'warehouses', label: 'Warehouses', icon: Building2 },
  { id: 'orders', label: 'Purchase Orders', icon: ClipboardList },
  { id: 'suppliers', label: 'Suppliers', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarRailProps {
  activeScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function SidebarRail({
  activeScreen,
  onSelectScreen,
  mobileOpen,
  onCloseMobile,
}: SidebarRailProps) {
  const { user, settings, signInWithGoogle, signOutUser, skus } = useLedger();

  const handleNav = (id: ScreenId) => {
    onSelectScreen(id);
    onCloseMobile();
  };

  const renderNavContent = (isDrawer: boolean) => (
    <div className="flex flex-col h-full bg-[#14211D] text-white select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#C7E78B] text-[#14211D] flex items-center justify-center font-display font-extrabold text-sm tracking-tight shrink-0">
            KL
          </div>
          <span
            className={`font-display font-bold text-base tracking-tight text-white whitespace-nowrap truncate ${
              isDrawer ? 'block' : 'hidden xl:block'
            }`}
          >
            Kinetic Ledger
          </span>
        </div>
        {isDrawer && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation drawer"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav aria-label="Main Navigation" className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
              className={`relative w-full h-11 px-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-[#BBCDC6] hover:text-white hover:bg-white/[0.06]'
              } ${!isDrawer ? 'md:justify-center xl:justify-start' : ''}`}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#C7E78B]"
                  aria-hidden="true"
                />
              )}
              <Icon
                className={`w-[18px] h-[18px] shrink-0 ${
                  isActive ? 'text-[#C7E78B]' : 'text-[#8FA39B]'
                }`}
              />
              <span className={isDrawer ? 'block' : 'hidden xl:block'}>{item.label}</span>
              {item.id === 'inventory' && (
                <span
                  className={`ml-auto text-[11px] font-mono tabular-nums-lining text-[#9BB0A8] ${
                    isDrawer ? 'block' : 'hidden xl:block'
                  }`}
                >
                  {skus.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Operator & Cloud Sync Footer */}
      <div className="p-3 border-t border-white/10 space-y-2.5 shrink-0">
        <div
          className={`flex items-center gap-3 px-2 py-1.5 rounded-lg bg-white/[0.04] ${
            !isDrawer ? 'md:justify-center xl:justify-start' : ''
          }`}
        >
          <img
            src={user?.photoURL || OPERATOR_AVATAR_URL}
            alt={user?.displayName || settings.operatorName}
            referrerPolicy="no-referrer"
            className="w-9 h-9 rounded-lg object-cover shrink-0 bg-[#23332D]"
          />
          <div className={`min-w-0 flex-1 ${isDrawer ? 'block' : 'hidden xl:block'}`}>
            <p className="text-xs font-semibold text-white truncate">
              {user?.displayName || settings.operatorName}
            </p>
            <p className="text-[11px] text-[#9BB0A8] truncate">
              {user ? user.email : 'Local Workspace'}
            </p>
          </div>
        </div>

        {user ? (
          <button
            type="button"
            onClick={() => void signOutUser()}
            aria-label="Sign out of cloud ledger"
            className={`w-full h-9 px-3 rounded-lg border border-white/15 text-xs font-semibold text-[#D7E6DF] hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              !isDrawer ? 'md:justify-center xl:justify-start' : 'justify-center'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className={isDrawer ? 'inline' : 'hidden xl:inline'}>Sign Out</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            aria-label="Sign in with Google for Cloud Sync"
            className={`w-full h-9 px-3 rounded-lg bg-[#C7E78B] hover:bg-[#B8DC7A] text-[#14211D] text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              !isDrawer ? 'md:justify-center xl:justify-center' : 'justify-center'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span className={isDrawer ? 'inline' : 'hidden xl:inline'}>Sync with Google</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet Fixed Rail */}
      <aside className="hidden md:block md:w-[80px] xl:w-[260px] shrink-0 h-screen sticky top-0 z-30">
        {renderNavContent(false)}
      </aside>

      {/* Mobile Slide-Out Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#14211D]/60 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-[272px] max-w-[85vw] h-full z-10 shadow-2xl">
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
