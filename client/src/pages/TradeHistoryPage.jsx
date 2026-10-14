import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, Eye, Filter, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { tradeApi, strategyApi, toErrorMessage } from '../services/api.js';
import { Card, EmptyState, ErrorBanner, Spinner } from '../components/ui.jsx';
import { INSTRUMENTS, OUTCOMES } from '../constants/index.js';
import { TradeForm } from '../components/TradeForm.jsx';
import { useBalance } from '../balance/BalanceContext.jsx';
import { computeAccountEquity } from '../utils/account.js';
import { formatMoney } from '../utils/format.js';

/**
 * Trade History — searchable, filterable, sortable, paginated table with
 * detail view, edit-in-modal, delete-with-confirmation and CSV export.
 */

const PAGE_SIZES = [10, 25, 50];

export default function TradeHistoryPage() {
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState('tradeDate');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [trades, setTrades] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [strategies, setStrategies] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingState, setDeletingState] = useState(false);

  const loadTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: pageSize, sort, order, ...filters };
      const res = await tradeApi.getTrades(params);
      setTrades(res.data.trades);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sort, order, filters]);

  const { startingBalance, riskPercent } = useBalance();

  // All trades (uncapped, like the Dashboard does) — used to compute the
  // running balance / P&L per trade so the money columns are correct even
  // when the table is paginated or filtered.
  const [allBalanceTrades, setAllBalanceTrades] = useState([]);

  useEffect(() => {
    tradeApi
      .getTrades({ limit: 1000, sort: 'tradeDate', order: 'asc' })
      .then((res) => setAllBalanceTrades(res.data.trades))
      .catch(() => {});
  }, []);

  const equity = useMemo(
    () => computeAccountEquity(allBalanceTrades, { startingBalance, riskPercent }),
    [allBalanceTrades, startingBalance, riskPercent]
  );

  const equityEnabled = equity.enabled && equity.tradesCounted > 0;

  // Strategy list for the filter dropdown (loaded once).
  useEffect(() => {
    Promise.all([
      tradeApi.getTrades({ limit: 1000, sort: 'tradeDate', order: 'desc' }).catch(() => ({ data: { trades: [] } })),
      strategyApi.getStrategies().catch(() => ({ data: { strategies: [] } })),
    ]).then(([tradesRes, stratRes]) => {
      const fromTrades = tradesRes.data?.trades?.map((t) => t.strategy).filter(Boolean) || [];
      const fromDb = stratRes.data?.strategies?.map((s) => s.title).filter(Boolean) || [];
      const unique = [...new Set([...fromTrades, ...fromDb])].sort();
      setStrategies(unique);
    });
  }, []);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const hasActiveFilters = Object.values(filters).some((value) => value && value !== 'all');

  const updateFilter = (field, value) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === '' || value === 'all') delete next[field];
      else next[field] = value;
      return next;
    });
    setPage(1);
  };

  const toggleSort = (field) => {
    if (sort === field) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setOrder('desc');
    }
    setPage(1);
  };
async function handleExport() {
    const params = {};
    if (Object.keys(filters).length) Object.assign(params, filters);
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => { if (value) query.set(key, value); });
      const qs = query.toString() ? `?${query.toString()}` : '';
      const response = await fetch(`/api/trades/export/csv${qs}`, { headers: { Accept: 'text/csv' } });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Export failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tradetracker-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  return (
    <div className="animate-fade-rise space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Trade History</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {pagination.total} closed trade{pagination.total === 1 ? '' : 's'} on record
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleExport} className="btn-secondary btn-sm">
            <Download size={15} />
            Export CSV
          </button>
          <a href="/add" className="btn-primary btn-sm">
            <Plus size={15} />
            Add trade
          </a>
        </div>
      </header>

      <ErrorBanner message={error} onRetry={loadTrades} />

      <FiltersRow
        filters={filters}
        strategies={strategies}
        hasActiveFilters={hasActiveFilters}
        onUpdate={updateFilter}
        onClear={() => { setFilters({}); setPage(1); }}
      />

      <Card className="overflow-hidden p-0">
        {loading && trades.length === 0 ? (
          <Spinner />
        ) : trades.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? 'No trades match your filters' : 'No trades recorded yet'}
            message={hasActiveFilters ? 'Try widening the date range or clearing filters.' : 'Add your first backtested trade and it will appear here.'}
            icon={<Search size={36} />}
          />
        ) : (
          <TradesTable
            trades={trades}
            sort={sort}
            order={order}
            onSort={toggleSort}
            onView={setViewing}
            onEdit={setEditing}
            onDelete={setDeleting}
            equity={equity}
            equityEnabled={equityEnabled}
          />
        )}

        {pagination.pages > 0 && (
          <PaginationBar
            page={page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        )}
      </Card>

      {viewing && (
        <TradeDetailModal
          trade={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
          equity={equity}
          equityEnabled={equityEnabled}
        />
      )}
      {editing && (
        <EditModal
          trade={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setTrades((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            loadTrades();
          }}
          saving={saving}
          setSaving={setSaving}
        />
      )}
      {deleting && (
        <DeleteModal
          trade={deleting}
          deletingState={deletingState}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            setDeletingState(true);
            try {
              await tradeApi.deleteTrade(deleting.id);
              setDeleting(null);
              loadTrades();
            } catch (err) {
              setError(toErrorMessage(err));
              setDeletingState(false);
            }
          }}
        />
      )}
    </div>
  );
}
function FiltersRow({ filters, strategies, hasActiveFilters, onUpdate, onClear }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="label">Search</label>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              className="input pl-9"
              placeholder="Strategy, notes, instrument…"
              value={filters.search || ''}
              onChange={(e) => onUpdate('search', e.target.value)}
            />
          </div>
        </div>
        <FilterSelect label="Instrument" value={filters.instrument || 'all'} onChange={(v) => onUpdate('instrument', v)} options={[{ value: 'all', label: 'All instruments' }, ...INSTRUMENTS]} />
        <FilterSelect label="Outcome" value={filters.outcome || 'all'} onChange={(v) => onUpdate('outcome', v)} options={[{ value: 'all', label: 'All outcomes' }, ...OUTCOMES]} />
        <FilterSelect label="Strategy" value={filters.strategy || 'all'} onChange={(v) => onUpdate('strategy', v)} options={[{ value: 'all', label: 'All strategies' }, ...strategies.map((s) => ({ value: s, label: s }))]} />
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={filters.startDate || ''} onChange={(e) => onUpdate('startDate', e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={filters.endDate || ''} onChange={(e) => onUpdate('endDate', e.target.value)} />
        </div>
        {hasActiveFilters && (
          <button type="button" onClick={onClear} className="btn-secondary btn-sm">
            <Filter size={14} />
            Clear
          </button>
        )}
      </div>
    </Card>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}
/** Build a display-friendly trade value (handles both `id` and `_id`). */
function tradeId(trade) {
  return trade.id || trade._id;
}

/** Format tradeDate for the raw API objects used in the table. */
function tradeDateStr(trade) {
  if (!trade.tradeDate) return '—';
  const d = new Date(trade.tradeDate);
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function priceOrDash(value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString('en-US', { maximumFractionDigits: 5 });
}

function rText(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  const num = Number(value);
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}R`;
}
/** Trades table with sortable headers and action buttons. */
function TradesTable({ trades, sort, order, onSort, onView, onEdit, onDelete, equity, equityEnabled }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse">
        <thead className="border-b border-border">
          <tr>
            <SortableTh label="Date" field="tradeDate" sort={sort} order={order} onSort={onSort} />
            <SortableTh label="Instrument" field="instrument" sort={sort} order={order} onSort={onSort} />
            <th className="th">Direction</th>
            <SortableTh label="Strategy" field="strategy" sort={sort} order={order} onSort={onSort} />
            <th className="th">Timeframe</th>
            <th className="th text-right">Entry</th>
            <th className="th text-right">SL</th>
            <th className="th text-right">Exit</th>
            <th className="th">Outcome</th>
            <SortableTh label="Actual R" field="actualR" sort={sort} order={order} onSort={onSort} align="right" />
            {equityEnabled && (
              <>
                <th className="th text-right">P&L ($)</th>
                <th className="th text-right">Balance</th>
              </>
            )}
            <th className="th text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {trades.map((trade) => (
            <TradeRow
              key={tradeId(trade)}
              trade={trade}
              equity={equityEnabled ? equity.perTrade.get(String(tradeId(trade))) : null}
              onView={() => onView(trade)}
              onEdit={() => onEdit(trade)}
              onDelete={() => onDelete(trade)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortableTh({ label, field, sort, order, onSort, align = 'left' }) {
  const active = sort === field;
  return (
    <th className={`th cursor-pointer select-none hover:text-neutral-200 ${align === 'right' ? 'text-right' : ''}`} onClick={() => onSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (order === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
        {!active && <ChevronDown size={13} className="opacity-0" />}
      </span>
    </th>
  );
}

function TradeRow({ trade, equity, onView, onEdit, onDelete }) {
  const r = Number(trade.actualR);
  const rowClass = r > 0 ? 'bg-positive/4' : r < 0 ? 'bg-negative/4' : '';

  return (
    <tr className={`transition-colors hover:bg-surface-alt ${rowClass}`}>
      <td className="td whitespace-nowrap text-neutral-400">{tradeDateStr(trade)}</td>
      <td className="td whitespace-nowrap font-medium text-foreground">
        {trade.instrument}
        {trade.isDemo && <DemoBadgeInline />}
      </td>
      <td className="td">
        <DirectionPill direction={trade.direction} />
      </td>
      <td className="td max-w-[180px] truncate text-neutral-300">{trade.strategy || '—'}</td>
      <td className="td text-neutral-400">{trade.timeframe || '—'}</td>
      <td className="td text-right font-mono text-neutral-300">{priceOrDash(trade.entryPrice)}</td>
      <td className="td text-right font-mono text-neutral-400">{priceOrDash(trade.stopLoss)}</td>
      <td className="td text-right font-mono text-neutral-300">{priceOrDash(trade.exitPrice)}</td>
      <td className="td"><OutcomePill outcome={trade.outcome} /></td>
      <td className={`td whitespace-nowrap text-right font-mono font-semibold ${r > 0 ? 'text-positive' : r < 0 ? 'text-negative' : 'text-neutral-400'}`}>
        {rText(trade.actualR)}
      </td>
      {equity && (
        <>
          <td className={`td whitespace-nowrap text-right font-mono font-semibold ${equity.pnl > 0 ? 'text-positive' : equity.pnl < 0 ? 'text-negative' : 'text-neutral-400'}`}>
            {formatMoney(equity.pnl, { showSign: true })}
          </td>
          <td className="td whitespace-nowrap text-right font-mono text-neutral-300">
            {formatMoney(equity.balanceAfter)}
          </td>
        </>
      )}
      <td className="td">
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={onView} className="btn-secondary btn-sm" title="View details">
            <Eye size={14} />
            <span className="sr-only">View</span>
          </button>
          <button type="button" onClick={onEdit} className="btn-secondary btn-sm" title="Edit trade">
            <Pencil size={14} />
            <span className="sr-only">Edit</span>
          </button>
          <button type="button" onClick={onDelete} className="btn-danger btn-sm" title="Delete trade">
            <Trash2 size={14} />
            <span className="sr-only">Delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

function DemoBadgeInline() {
  return <span className="ml-1.5 rounded-full border border-amber-600/30 bg-amber-600/10 px-1.5 py-px text-[10px] font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">demo</span>;
}

function DirectionPill({ direction }) {
  const isBuy = direction === 'BUY';
  return (
    <span className={`chip ${isBuy ? 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-red-600/25 bg-red-600/10 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400'}`}>
      {isBuy ? '▲ Buy' : '▼ Sell'}
    </span>
  );
}

function OutcomePill({ outcome }) {
  const styles = {
    WIN: 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400',
    LOSS: 'border-red-600/25 bg-red-600/10 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400',
    BREAKEVEN: 'border-neutral-500/25 bg-neutral-500/10 text-neutral-500',
  };
  const labels = { WIN: 'Win', LOSS: 'Loss', BREAKEVEN: 'Breakeven' };
  return <span className={`chip ${styles[outcome] || styles.BREAKEVEN}`}>{labels[outcome] || outcome || '—'}</span>;
}
function PaginationBar({ page, pages, total, pageSize, onPageChange, onPageSizeChange }) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        <span>Showing {first}–{last} of {total}</span>
        <select
          className="rounded-md border border-border bg-input px-2 py-1 text-xs text-neutral-300"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={15} />
        </button>
        <span className="px-2 text-xs text-neutral-400">Page {page} / {pages}</span>
        <button type="button" className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

const SESSION_LABELS = { ASIA: 'Asian', LONDON: 'London', NEW_YORK: 'New York', OTHER: 'Other' };

function TradeDetailModal({ trade, onClose, onEdit, equity, equityEnabled }) {
  const r = Number(trade.actualR);
  const perTrade = equityEnabled ? equity?.perTrade.get(String(tradeId(trade))) : null;
  return (
    <ModalShell onClose={onClose} title={trade.instrument}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <DirectionPill direction={trade.direction} />
          <OutcomePill outcome={trade.outcome} />
          {trade.isDemo && <span className="chip border-amber-600/30 bg-amber-600/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">Demo</span>}
          <span className="text-sm text-neutral-400">{tradeDateStr(trade)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Detail label="Entry" value={priceOrDash(trade.entryPrice)} mono />
          <Detail label="Stop-loss" value={priceOrDash(trade.stopLoss)} mono />
          <Detail label="Take-profit" value={priceOrDash(trade.takeProfit)} mono />
          <Detail label="Exit" value={priceOrDash(trade.exitPrice)} mono />
          <Detail
            label="Actual R"
            value={rText(trade.actualR)}
            mono
            highlight={r > 0 ? 'text-positive' : r < 0 ? 'text-negative' : 'text-neutral-400'}
          />
          <Detail label="Planned R:R" value={trade.plannedRR == null ? 'N/A' : `${trade.plannedRR} : 1`} mono />
        </div>

        {perTrade && (
          <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-surface-alt/40 p-3 text-sm">
            <div><p className="text-xs text-neutral-500">P&L ($)</p><p className={`mt-0.5 font-mono font-semibold ${perTrade.pnl > 0 ? 'text-positive' : perTrade.pnl < 0 ? 'text-negative' : 'text-neutral-400'}`}>{formatMoney(perTrade.pnl, { showSign: true })}</p></div>
            <div><p className="text-xs text-neutral-500">Balance after</p><p className="mt-0.5 font-mono font-semibold text-foreground">{formatMoney(perTrade.balanceAfter)}</p></div>
            <div><p className="text-xs text-neutral-500">Risk used</p><p className="mt-0.5 font-mono font-semibold text-neutral-400">{formatMoney(perTrade.riskAmount)}</p></div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-alt/40 p-3 text-sm sm:grid-cols-4">
          <div><p className="text-xs text-neutral-500">Strategy</p><p className="mt-0.5 font-medium text-foreground">{trade.strategy || '—'}</p></div>
          <div><p className="text-xs text-neutral-500">Timeframe</p><p className="mt-0.5 font-medium text-foreground">{trade.timeframe || '—'}</p></div>
          <div><p className="text-xs text-neutral-500">Session</p><p className="mt-0.5 font-medium text-foreground">{SESSION_LABELS[trade.session] || trade.session || '—'}</p></div>
          <div><p className="text-xs text-neutral-500">Created</p><p className="mt-0.5 font-medium text-neutral-300">{trade.createdAt ? new Date(trade.createdAt).toLocaleDateString() : '—'}</p></div>
        </div>

        {trade.notes ? (
          <div>
            <p className="label">Notes</p>
            <p className="whitespace-pre-wrap rounded-lg border border-border bg-input p-3 text-sm text-neutral-300">{trade.notes}</p>
          </div>
        ) : null}

        {trade.screenshotUrl ? (
          <div>
            <p className="label">Chart screenshot</p>
            <a href={trade.screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline-offset-2 hover:underline">
              {trade.screenshotUrl}
            </a>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Close</button>
          <button type="button" onClick={onEdit} className="btn-primary">
            <Pencil size={15} />
            Edit
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function Detail({ label, value, mono, highlight }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className={`font-medium text-foreground ${mono ? 'font-mono' : ''} ${highlight || ''}`}>{value}</p>
    </div>
  );
}
function EditModal({ trade, onClose, onSaved, saving, setSaving }) {
  const initial = {
    ...trade,
    tradeDate: trade.tradeDate ? new Date(trade.tradeDate).toISOString().slice(0, 10) : '',
    takeProfit: trade.takeProfit ?? '',
  };

  return (
    <ModalShell onClose={onClose} title="Edit trade">
      <TradeForm
        initial={initial}
        compact
        submitLabel="Save changes"
        submitting={saving}
        onCancel={onClose}
        onSubmit={async (payload) => {
          setSaving(true);
          try {
            const res = await tradeApi.updateTrade(tradeId(trade), payload);
            setSaving(false);
            onSaved(res.data);
            onClose();
          } catch (err) {
            setSaving(false);
            window.alert(toErrorMessage(err));
          }
        }}
      />
    </ModalShell>
  );
}

function DeleteModal({ trade, deletingState, onCancel, onConfirm }) {
  return (
    <ModalShell onClose={onCancel} title="Delete trade" danger>
      <p className="text-sm text-neutral-300">
        Are you sure you want to delete this <strong className="text-foreground">{trade.direction}</strong>{' '}
        {trade.instrument} trade from <strong className="text-neutral-200">{tradeDateStr(trade)}</strong>?
      </p>
      <p className="mt-2 text-xs text-neutral-500">
        This removes it from all dashboard metrics and charts permanently.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="button" onClick={onConfirm} className="btn-danger">
          <Trash2 size={15} />
          {deletingState ? 'Deleting…' : 'Delete trade'}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ onClose, title, danger, children }) {
  // Lock background scrolling while a modal is open so the page behind
  // doesn't scroll under the dialog.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          className="relative w-full max-w-2xl rounded-2xl border border-border bg-surface p-5 shadow-2xl animate-fade-rise sm:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className={`text-lg font-semibold ${danger ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{title}</h2>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-surface-alt hover:text-foreground" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}