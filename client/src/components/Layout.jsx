import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Moon,
  Plus,
  Settings,
  Sun,
  Table2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useTheme } from '../theme/ThemeContext.jsx';
import { useBalance } from '../balance/BalanceContext.jsx';
import { tradeApi } from '../services/api.js';
import { computeAccountEquity } from '../utils/account.js';
import { formatMoney, formatNumber } from '../utils/format.js';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/trades', label: 'Trade History', icon: Table2 },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/** Brand mark with a gradient logo tile and a "live" status dot. */
function Brand() {
  return (
    <div className="flex items-center gap-3 px-1">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent via-blue-600 to-indigo-600 text-white shadow-lg shadow-accent/30 ring-1 ring-inset ring-white/20">
        <Activity size={18} strokeWidth={2.4} />
        <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-emerald-500" />
      </span>
      <div className="leading-tight">
        <p className="text-[15px] font-bold tracking-tight text-foreground">TradeTrack</p>
        <p className="text-[11px] font-medium text-neutral-500">Backtest Journal</p>
      </div>
    </div>
  );
}

/** Primary action button — jumps to the trade form. */
function QuickAdd({ onClick }) {
  return (
    <NavLink
      to="/add"
      onClick={onClick}
      className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-accent via-blue-600 to-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all duration-200 hover:shadow-accent/40 hover:brightness-110 active:scale-[0.98]"
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
      <Plus size={16} strokeWidth={2.6} />
      Add Trade
    </NavLink>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
      {children}
    </p>
  );
}

function NavLinks({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-accent/15 text-foreground'
                : 'text-neutral-400 hover:bg-surface-alt/70 hover:text-neutral-100'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent shadow-[0_0_10px_rgba(59,130,246,0.7)]" />
              )}
              <Icon
                size={17}
                className={'shrink-0 transition-colors ' + (isActive ? 'text-accent' : 'text-neutral-500 group-hover:text-neutral-300')}
              />
              <span className="flex-1">{label}</span>
              {isActive ? (
                <span className="h-1.5 w-1.5 rounded-full bg-accent/80" />
              ) : (
                <ChevronRight
                  size={14}
                  className="text-neutral-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
/** Sun/Moon switch that toggles between dark and light themes. */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ' + (isDark ? 'bg-accent' : 'bg-neutral-300')}
    >
      <span
        className={'flex h-5 w-5 items-center justify-center rounded-full bg-white text-neutral-600 shadow-sm transition-transform duration-200 ' + (isDark ? 'translate-x-[22px]' : 'translate-x-0.5')}
      >
        {isDark ? <Moon size={10} /> : <Sun size={10} />}
      </span>
    </button>
  );
}

/*
 * Mini account widget — live balance, money P&L and total R derived from the
 * journal's trades (same math as the AccountBalanceCard). Refreshes on route
 * change so a newly added trade shows up immediately.
 */
function AccountSnapshot() {
  const { startingBalance, riskPercent } = useBalance();
  const location = useLocation();
  const [trades, setTrades] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    tradeApi
      .getTrades({ limit: 1000, sort: 'tradeDate', order: 'asc' })
      .then((res) => {
        if (cancelled) return;
        setTrades(res.data?.trades || []);
        setStatus('ok');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const equity = useMemo(
    () => computeAccountEquity(trades, { startingBalance, riskPercent }),
    [trades, startingBalance, riskPercent]
  );

  if (status === 'error') return null;

  const pnlPositive = equity.totalPnl >= 0;
  const showPnl = equity.enabled && equity.tradesCounted > 0;
  const hint = !equity.enabled ? 'Set balance & risk in Settings' : 'Add trades to track P&L';

  return (
    <div className="rounded-xl border border-border/80 bg-surface-alt/40 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent/15 text-accent">
            <Wallet size={10} />
          </span>
          Account
        </span>
        {showPnl && (
          <span className={'flex items-center gap-0.5 text-[11px] font-semibold ' + (pnlPositive ? 'text-positive' : 'text-negative')}>
            {pnlPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {equity.totalR >= 0 ? '+' : ''}
            {formatNumber(equity.totalR, 1)}R
          </span>
        )}
      </div>
      <div className="mt-2">
        <p className="font-mono text-lg font-bold tracking-tight text-foreground">
          {formatMoney(equity.currentBalance)}
        </p>
        {showPnl ? (
          <p className={'mt-0.5 flex items-center gap-1 font-mono text-xs font-semibold ' + (pnlPositive ? 'text-positive' : 'text-negative')}>
            {pnlPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {formatMoney(equity.totalPnl, { showSign: true })}
            <span className="text-[10px] font-normal text-neutral-500">P&L</span>
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] leading-snug text-neutral-500">{hint}</p>
        )}
      </div>
    </div>
  );
}
function SidebarFooter() {
  return (
    <div className="mt-auto flex flex-col gap-3">
      <AccountSnapshot />
      <div className="flex items-center justify-between rounded-xl border border-border/80 bg-surface-alt/40 px-3 py-2">
        <span className="text-xs font-medium text-neutral-400">Theme</span>
        <ThemeToggle />
      </div>
      <p className="flex items-center gap-1.5 px-1 text-[10px] text-neutral-500">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        Local journal · data stays on this device
      </p>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-primary">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/70 bg-surface/80 backdrop-blur-xl md:flex">
        {/* Decorative colour glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -left-16 bottom-16 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <div className="relative flex flex-1 flex-col gap-7 overflow-y-auto px-4 py-5">
          <Brand />
          <div className="flex flex-col gap-5">
            <QuickAdd />
            <div className="flex flex-col gap-2">
              <SectionLabel>Navigate</SectionLabel>
              <NavLinks />
            </div>
          </div>
          <SidebarFooter />
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-primary/90 px-4 backdrop-blur md:hidden">
        <Brand />
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-neutral-300 hover:bg-surface-alt"
        >
          <Menu size={20} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/70 animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-surface shadow-2xl animate-slide-in-left">
            <div className="flex items-center justify-between px-3 py-5">
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
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-5">
              <div className="flex flex-col gap-5">
                <QuickAdd onClick={() => setOpen(false)} />
                <div className="flex flex-col gap-2">
                  <SectionLabel>Navigate</SectionLabel>
                  <NavLinks onNavigate={() => setOpen(false)} />
                </div>
              </div>
              <SidebarFooter />
            </div>
          </div>
        </div>
      )}

      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}