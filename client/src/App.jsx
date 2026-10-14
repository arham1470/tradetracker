import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AddTradePage from './pages/AddTradePage.jsx';
import TradeHistoryPage from './pages/TradeHistoryPage.jsx';
import StrategiesPage from './pages/StrategiesPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import { ThemeProvider } from './theme/ThemeContext.jsx';
import { BalanceProvider } from './balance/BalanceContext.jsx';

export default function App() {
  return (
    // Opt into the React Router v7 behaviours early to silence the future-flag
    // warnings and guarantee a smooth upgrade path.
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <BalanceProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/add" element={<AddTradePage />} />
              <Route path="/trades" element={<TradeHistoryPage />} />
              <Route path="/strategies" element={<StrategiesPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BalanceProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}