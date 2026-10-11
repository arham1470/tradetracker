import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Account balance settings (client-side, persisted in localStorage).
 *
 * Stores the trader's starting balance and risk-per-trade percentage. These
 * are used to convert the journal's R-multiples into real money P&L:
 *
 *   risk per trade = current running balance × risk%
 *   trade P&L      = risk per trade × actualR (compounding on the running balance)
 *
 * Keeping this client-side matches the app's "personal, local only" design —
 * no new database collection or API surface is required.
 */

const STARTING_BALANCE_KEY = 'tradetracker-starting-balance';
const RISK_PERCENT_KEY = 'tradetracker-risk-percent';

const BalanceContext = createContext(null);

function readSetting(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null || stored === '') return fallback;
    return stored;
  } catch {
    return fallback;
  }
}

export function BalanceProvider({ children }) {
  const [startingBalance, setStartingBalance] = useState(() =>
    readSetting(STARTING_BALANCE_KEY, '10000')
  );
  const [riskPercent, setRiskPercent] = useState(() => readSetting(RISK_PERCENT_KEY, '1'));

  useEffect(() => {
    try {
      window.localStorage.setItem(STARTING_BALANCE_KEY, startingBalance);
    } catch {
      /* localStorage unavailable — value still applies for this session */
    }
  }, [startingBalance]);

  useEffect(() => {
    try {
      window.localStorage.setItem(RISK_PERCENT_KEY, riskPercent);
    } catch {
      /* localStorage unavailable — value still applies for this session */
    }
  }, [riskPercent]);

  const value = useMemo(
    () => ({
      startingBalance,
      riskPercent,
      setStartingBalance,
      setRiskPercent,
      // Money P&L is only meaningful once a positive balance is configured.
      balanceConfigured: Number(startingBalance) > 0 && Number(riskPercent) > 0,
    }),
    [startingBalance, riskPercent]
  );

  return <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>;
}

export function useBalance() {
  const context = useContext(BalanceContext);
  if (!context) {
    throw new Error('useBalance must be used within a <BalanceProvider>');
  }
  return context;
}