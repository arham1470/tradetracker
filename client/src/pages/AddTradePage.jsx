import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { TradeForm } from '../components/TradeForm.jsx';
import { tradeApi, toErrorMessage } from '../services/api.js';
import { ErrorBanner } from '../components/ui.jsx';

export default function AddTradePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError(null);
    try {
      await tradeApi.createTrade(payload);
      setSaved(true);
      // Wait a moment so the success state is visible, then go to history.
      setTimeout(() => navigate('/trades'), 600);
    } catch (err) {
      setError(toErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-rise">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Add Trade</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Log a completed backtested trade. Actual R, planned R:R and outcome are computed automatically by the server.
        </p>
      </header>

      <ErrorBanner message={error} />

      {saved && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 size={18} className="shrink-0" />
          Trade saved — redirecting to Trade History…
        </div>
      )}

      <TradeForm onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}