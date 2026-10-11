/** Tiny display helpers shared across pages. */

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`card p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, right }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/** Outcome badge with consistent green/red/neutral styling (theme-aware). */
export function OutcomeBadge({ outcome }) {
  const styles = {
    WIN: 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400',
    LOSS: 'border-red-600/25 bg-red-600/10 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400',
    BREAKEVEN: 'border-neutral-500/25 bg-neutral-500/10 text-neutral-500',
  };
  const labels = { WIN: 'Win', LOSS: 'Loss', BREAKEVEN: 'Breakeven' };
  return <span className={`chip ${styles[outcome] || styles.BREAKEVEN}`}>{labels[outcome] || outcome}</span>;
}

export function DirectionBadge({ direction }) {
  return (
    <span
      className={`chip ${
        direction === 'BUY'
          ? 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'border-red-600/25 bg-red-600/10 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400'
      }`}
    >
      {direction === 'BUY' ? '▲ Buy' : '▼ Sell'}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span
      className="chip border-amber-600/30 bg-amber-600/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
      title="Demo seed record"
    >
      Demo
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', message, icon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      {icon && <div className="text-neutral-600">{icon}</div>}
      <p className="text-sm font-medium text-neutral-300">{title}</p>
      <p className="max-w-md text-xs leading-relaxed text-neutral-500">{message}</p>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 font-medium text-red-700 underline-offset-2 hover:underline dark:text-red-200">
          Retry
        </button>
      )}
    </div>
  );
}

export function Pills({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            value === option.value
              ? 'border-accent bg-accent/15 text-foreground'
              : 'border-border text-neutral-400 hover:bg-surface hover:text-neutral-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}