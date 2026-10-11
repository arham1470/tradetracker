import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Light/dark theme context.
 *
 * Persists the choice in localStorage (key: "tradetracker-theme") and mirrors
 * it onto the <html> element as a `.dark` class so Tailwind's
 * `darkMode: 'class'` variants apply. Defaults to `dark` to match the app's
 * original appearance for existing users.
 *
 * The inline script in index.html applies the stored theme before React
 * mounts, so there is no flash of the wrong theme on reload.
 */

const STORAGE_KEY = 'tradetracker-theme';
const ThemeContext = createContext(null);

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  // Inline bootstrap script in index.html already synced <html> before React —
  // read its state and let the localStorage value win if present.
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* localStorage unavailable — fall through to DOM */
  }
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* localStorage unavailable — theme still applies for this session */
    }

    // Keep the browser chrome/title-bar color in sync with the active theme.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#07090c' : '#f6f8fa');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return context;
}