import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  FileText,
  Layers,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { strategyApi, toErrorMessage } from '../services/api.js';
import { EmptyState, ErrorBanner } from '../components/ui.jsx';
import { formatNumber } from '../utils/format.js';

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modal states
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [activeStrategy, setActiveStrategy] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDetails, setFormDetails] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Success flash message
  const [flash, setFlash] = useState(null);

  const showFlash = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3500);
  };

  const fetchStrategies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await strategyApi.getStrategies();
      setStrategies(res.data?.strategies || []);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setActiveStrategy(null);
    setFormTitle('');
    setFormDetails('');
    setFormError(null);
  };

  const openEditModal = (strat) => {
    setModalMode('edit');
    setActiveStrategy(strat);
    setFormTitle(strat.title);
    setFormDetails(strat.details || '');
    setFormError(null);
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveStrategy(null);
    setFormTitle('');
    setFormDetails('');
    setFormError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Strategy title is required.');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      if (modalMode === 'create') {
        await strategyApi.createStrategy({
          title: formTitle.trim(),
          details: formDetails.trim(),
        });
        showFlash(`Strategy "${formTitle.trim()}" created successfully.`);
      } else if (modalMode === 'edit') {
        const id = activeStrategy.id || activeStrategy._id;
        await strategyApi.updateStrategy(id, {
          title: formTitle.trim(),
          details: formDetails.trim(),
        });
        showFlash(`Strategy "${formTitle.trim()}" updated successfully.`);
      }
      closeModal();
      fetchStrategies();
    } catch (err) {
      setFormError(toErrorMessage(err));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const id = deleteTarget.id || deleteTarget._id;
      await strategyApi.deleteStrategy(id);
      showFlash(`Strategy "${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
      fetchStrategies();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  // Filtered strategies
  const filteredStrategies = useMemo(() => {
    if (!search.trim()) return strategies;
    const query = search.toLowerCase();
    return strategies.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        (s.details && s.details.toLowerCase().includes(query))
    );
  }, [strategies, search]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = strategies.length;
    let totalTrades = 0;
    let bestStrategy = null;

    for (const s of strategies) {
      totalTrades += s.tradeCount || 0;
      if (!bestStrategy || (s.netR || 0) > (bestStrategy.netR || 0)) {
        if (s.tradeCount > 0) bestStrategy = s;
      }
    }

    return { total, totalTrades, bestStrategy };
  }, [strategies]);

  return (
    <div className="space-y-6 animate-fade-rise">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Target size={20} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Strategies</h1>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Define your trading systems, rulebooks, and confluences. Select them when logging trades.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={2.6} />
          New Strategy
        </button>
      </div>

      {/* Flash Success Notification */}
      {flash && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-600/25 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300 animate-fade-in">
          <CheckCircle2 size={18} className="shrink-0" />
          {flash}
        </div>
      )}

      {/* Global Error Banner */}
      <ErrorBanner message={error} />

      {/* Stats Summary Bar */}
      {strategies.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="card p-4">
            <p className="label">Total Strategies</p>
            <p className="mt-1 font-mono text-2xl font-bold text-foreground">
              {stats.total}
            </p>
          </div>
          <div className="card p-4">
            <p className="label">Total Logged Trades</p>
            <p className="mt-1 font-mono text-2xl font-bold text-foreground">
              {stats.totalTrades}
            </p>
          </div>
          <div className="col-span-2 card p-4 sm:col-span-1">
            <p className="label">Top Performing</p>
            <p className="mt-1 truncate font-mono text-lg font-bold text-accent">
              {stats.bestStrategy
                ? `${stats.bestStrategy.title} (${stats.bestStrategy.netR > 0 ? '+' : ''}${formatNumber(stats.bestStrategy.netR, 1)}R)`
                : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Search / Filters */}
      {strategies.length > 0 && (
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
          />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search strategies by title or details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-foreground"
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="card flex items-center justify-center p-12 text-sm text-neutral-500">
          Loading strategies…
        </div>
      ) : filteredStrategies.length === 0 ? (
        strategies.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Layers size={28} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">No strategies added yet</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-neutral-500">
              Create your trading strategies (e.g., "London Breakout", "FVG Retest") with rules and details so you can select them from the dropdown when logging trades.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="btn-primary mx-auto mt-5"
            >
              <Plus size={16} />
              Add First Strategy
            </button>
          </div>
        ) : (
          <EmptyState
            title="No matching strategies"
            description={`No strategies matched "${search}". Try clearing your search term.`}
            actionLabel="Clear search"
            onAction={() => setSearch('')}
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStrategies.map((strat) => {
            const hasTrades = (strat.tradeCount || 0) > 0;
            const pnlPositive = (strat.netR || 0) >= 0;

            return (
              <div
                key={strat.id || strat._id}
                className="group card relative flex flex-col justify-between p-5 transition-all duration-200 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-foreground group-hover:text-accent transition-colors">
                      {strat.title}
                    </h3>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEditModal(strat)}
                        title="Edit Strategy"
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-surface-alt hover:text-foreground"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(strat)}
                        title="Delete Strategy"
                        className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-500/10 hover:text-rose-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Details / Description */}
                  {strat.details ? (
                    <p className="mt-2.5 whitespace-pre-line text-xs leading-relaxed text-neutral-400">
                      {strat.details}
                    </p>
                  ) : (
                    <p className="mt-2.5 text-xs italic text-neutral-600">
                      No details or rules added. Click edit to add trade criteria.
                    </p>
                  )}
                </div>

                {/* Performance & Action Footer */}
                <div className="mt-5 border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-500">
                        <strong className="font-mono text-neutral-300">{strat.tradeCount || 0}</strong> trades
                      </span>
                      {hasTrades && (
                        <>
                          <span className="text-neutral-500">
                            <strong className="font-mono text-neutral-300">{strat.winRate}%</strong> WR
                          </span>
                          <span
                            className={
                              'font-mono font-semibold ' +
                              (pnlPositive ? 'text-positive' : 'text-negative')
                            }
                          >
                            {strat.netR > 0 ? '+' : ''}
                            {formatNumber(strat.netR, 1)}R
                          </span>
                        </>
                      )}
                    </div>
                    <Link
                      to={`/add?strategy=${encodeURIComponent(strat.title)}`}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                    >
                      <Plus size={12} strokeWidth={2.4} />
                      Log Trade
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-fade-rise">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Target size={18} />
                </span>
                <h2 className="text-lg font-bold text-foreground">
                  {modalMode === 'create' ? 'Add Strategy' : 'Edit Strategy'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-neutral-400 hover:bg-surface-alt hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <ErrorBanner message={formError} />

              <div>
                <label className="label" htmlFor="strategyTitle">
                  Strategy Title *
                </label>
                <input
                  id="strategyTitle"
                  type="text"
                  className="input"
                  placeholder="e.g. London Breakout, Asian Range Sweep, ICT FVG..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  maxLength={80}
                  required
                  autoFocus
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  This title will be selectable in the trade entry dropdown.
                </p>
              </div>

              <div>
                <label className="label" htmlFor="strategyDetails">
                  Strategy Details & Rules{' '}
                  <span className="normal-case text-neutral-500">(optional)</span>
                </label>
                <textarea
                  id="strategyDetails"
                  rows={4}
                  className="input resize-y text-xs leading-relaxed"
                  placeholder="List your criteria, timeframes, indicators, entry triggers, stop loss placement rules..."
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  maxLength={2000}
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  Document key rules, confluences, or checklist for reference.
                </p>
              </div>

              {modalMode === 'edit' && activeStrategy?.tradeCount > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                  Renaming this strategy will automatically update {activeStrategy.tradeCount} trade
                  {activeStrategy.tradeCount > 1 ? 's' : ''} currently categorized under it.
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={formSubmitting}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn-primary"
                >
                  {formSubmitting
                    ? 'Saving…'
                    : modalMode === 'create'
                    ? 'Create Strategy'
                    : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-fade-rise">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
                <AlertCircle size={22} />
              </span>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Strategy</h3>
                <p className="text-xs text-neutral-400">
                  Are you sure you want to delete "{deleteTarget.title}"?
                </p>
              </div>
            </div>

            {deleteTarget.tradeCount > 0 && (
              <p className="mt-3 text-xs text-neutral-500">
                Note: {deleteTarget.tradeCount} existing trade
                {deleteTarget.tradeCount > 1 ? 's' : ''} with this strategy will keep their logged
                name, but the strategy won't appear in the dropdown for new trades.
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500 active:scale-95 transition"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
