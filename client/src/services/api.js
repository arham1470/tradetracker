import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// Centralised, readable errors.
function toErrorMessage(error) {
  if (error.response) {
    const data = error.response.data;
    if (data && data.error) return data.error;
    return `Request failed (${error.response.status})`;
  }
  if (error.code === 'ECONNABORTED') return 'Request timed out — is the server running?';
  if (!navigator.onLine) return 'No internet connection.';
  return 'Cannot reach the API. Is the server running?';
}

export const tradeApi = {
  /* Get trades with filters/pagination/sorting. Params are optional. */
  getTrades(params) {
    return api.get('/trades', { params });
  },
  getTrade(id) {
    return api.get(`/trades/${id}`);
  },
  createTrade(trade) {
    return api.post('/trades', trade);
  },
  updateTrade(id, trade) {
    return api.put(`/trades/${id}`, trade);
  },
  deleteTrade(id) {
    return api.delete(`/trades/${id}`);
  },
  exportCsv(params) {
    return api.get('/trades/export/csv', { params });
  },
};

export const analyticsApi = {
  getSummary(params) {
    return api.get('/analytics/summary', { params });
  },
  getInstruments(params) {
    return api.get('/analytics/instruments', { params });
  },
  getStrategies(params) {
    return api.get('/analytics/strategies', { params });
  },
};

export const strategyApi = {
  getStrategies(params) {
    return api.get('/strategies', { params });
  },
  getStrategy(id) {
    return api.get(`/strategies/${id}`);
  },
  createStrategy(strategy) {
    return api.post('/strategies', strategy);
  },
  updateStrategy(id, strategy) {
    return api.put(`/strategies/${id}`, strategy);
  },
  deleteStrategy(id) {
    return api.delete(`/strategies/${id}`);
  },
};

export const healthApi = {
  check() {
    return api.get('/health');
  },
};

export default api;
export { toErrorMessage };