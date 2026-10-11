import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  Menu,
  PencilLine,
  Settings,
  Table2,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/add', label: 'Add Trade', icon: PencilLine },
  { to: '/trades', label: 'Trade History', icon: Table2 },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent ring-1 ring-inset ring-accent/25">
        <Activity size={18} strokeWidth={2.2} />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight text-white">TradeTrack</p>
        <p className="text-[11px] text-neutral-500">Backtest Journal</p>
      </div>
    </div>
  );
}

function NavLinks({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-accent/12 text-white'
                : 'text-neutral-400 hover:bg-surface-alt/60 hover:text-neutral-100'
            }`
          }
        >
          <Icon size={17} className="shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="mt-auto hidden px-3 md:block">
      <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
        <p className="text-[11px] text-neutral-500">
          Manual backtesting journal. No broker integration — personal
          performance tracking only.
        </p>
      </div>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-primary">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col gap-6 border-r border-border bg-surface/60 py-5 md:flex">
        <Brand />
        <NavLinks />
        <SidebarFooter />
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-primary/90 px-4 backdrop-blur md:hidden">
        <Brand />
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-neutral-300 hover:bg-surface"
        >
          <Menu size={20} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col gap-6 bg-surface py-5 shadow-2xl animate-fade-rise">
            <div className="flex items-center justify-between px-3">
              <Brand />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-neutral-300 hover:bg-surface-alt"
              >
                <X size={18} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="md:pl-60">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}