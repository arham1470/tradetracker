# TradeTrack — Forex Backtesting Journal

A lightweight MERN web app for tracking **manual Forex backtesting** results.
After each backtested trade you enter the order details and TradeTrack
automatically computes your performance (actual R-multiple, planned R:R,
win rate, expectancy, drawdown, …).

**This is a personal journal — NOT a live trading platform.** No broker APIs,
no trade execution.

---

## Features

- **Add Trade form** — instrument (EURUSD / XAUUSD / AUDUSD), direction,
  strategy, timeframe (M1–D1), session, entry / stop-loss / take-profit / exit
  prices, notes, chart screenshot URL
- **Automatic math** — every save recomputes on the server:
  - Planned R:R and actual R-multiple (Buy & Sell formulas)
  - Outcome (Win / Loss / Breakeven) derived from the real exit price
  - Stop-loss placement validation (must be below entry for Buy, above for Sell)
- **Dashboard** — total closed trades, wins/losses/breakevens, win rate,
  net R, average R, average win/loss R, profit factor, expectancy,
  maximum drawdown, cumulative R equity curve, performance by instrument,
  win/loss distribution, monthly performance
- **Trade History** — search, filter (instrument / strategy / outcome / date
  range), sort by date & R-multiple, pagination, detail view, inline edit,
  delete with confirmation, **CSV export**
- **Analytics** — server-computed breakdowns by instrument and by strategy
- **Demo data** — optional seed script (~34 clearly labelled demo trades,
  `isDemo: true`) so you can explore the interface instantly
- Dark theme, responsive sidebar navigation, Recharts visualisations

---

## Tech stack

| Layer     | Technology |
| --------- | ---------- |
| Frontend  | React 18 + Vite + Tailwind CSS + Recharts + Lucide icons + Axios |
| Backend   | Node.js + Express |
| Database  | MongoDB with Mongoose schemas & indexes |

---

## Project structure

```text
tradetracker/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Layout, charts, form, UI primitives
│   │   ├── pages/          # Dashboard, Add Trade, Trade History, Analytics, Settings
│   │   ├── services/       # Axios API client
│   │   ├── utils/          # Formatting, dataset slicing, client-side calc mirror
│   │   └── App.jsx
│   └── package.json
├── server/                 # Express backend
│   ├── models/             # Trade schema (+ pre-validate derivation hook)
│   ├── controllers/        # trades CRUD + analytics endpoints
│   ├── routes/             # /api/trades, /api/analytics
│   ├── middleware/         # centralised error handling
│   ├── utils/              # calculations.js, analytics.js, seed script, tests
│   ├── config/             # database connection
│   └── server.js
└── README.md
```

---

## Prerequisites

- **Node.js** ≥ 18 (tested on Node 22)
- **MongoDB** running locally on `mongodb://127.0.0.1:27017`
  (or a MongoDB Atlas connection string)
---

## Getting started

### 1. Configure the backend

```bash
cd server
npm install
cp .env.example .env    # then edit .env with your own values
```

`.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/tradetracker
PORT=5000
CLIENT_URL=http://localhost:5173
```

> **Never commit `.env` — it is git-ignored.** This is a personal backtesting
> journal with no user accounts; run it on your own machine only.

### 2. (Optional) seed demo data

```bash
cd server
npm run seed            # insert ~34 demo trades (idempotent, isDemo: true)
npm run seed -- clean   # delete ALL trades (real + demo)
```

### 3. Run the backend

```bash
cd server
npm run dev             # nodemon on http://localhost:5000
```

### 4. Run the frontend

In a second terminal:

```bash
cd client
npm install
npm run dev             # Vite on http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:5000`, so no CORS
configuration is needed in development.

Open **[http://localhost:5173](http://localhost:5173)**.

---

## API Reference

Base URL: `http://localhost:5000/api`

| Method | Endpoint                 | Description                                        |
| ------ | ------------------------ | -------------------------------------------------- |
| GET    | `/health`                | Health check (server + db state)                   |
| GET    | `/trades`                | List with `?page&limit&sort&order&instrument&outcome&strategy&search&startDate&endDate` |
| GET    | `/trades/:id`            | Single trade                                       |
| POST   | `/trades`                | Create a trade (server recomputes derived fields)  |
| PUT    | `/trades/:id`            | Update a trade                                     |
| DELETE | `/trades/:id`            | Delete a trade (204)                               |
| GET    | `/trades/export/csv`     | CSV download of filtered trades                    |
| GET    | `/analytics/summary`     | Dashboard metrics + equity curve + monthly buckets |
| GET    | `/analytics/instruments` | Per-instrument metrics                             |
| GET    | `/analytics/strategies`  | Per-strategy metrics                               |
---

## Calculation rules (source of truth: `server/utils/calculations.js`)

```
For BUY : risk = entry − SL, reward = TP − entry
For SELL: risk = SL − entry, reward = entry − TP
planned R:R = reward / risk            → null when TP omitted or reward ≤ 0

For BUY : actual R = (exit − entry) / |entry − SL|
For SELL: actual R = (entry − exit) / |entry − SL|
outcome = WIN / LOSS / BREAKEVEN from the sign of actual R
```

Server-side metrics (`server/utils/analytics.js`):

```
winRate      = wins / totalClosed × 100
netR         = Σ actualR
avgR         = netR / totalClosed
profitFactor = Σ(positive R) / |Σ(negative R)|   → null (N/A) when losses = 0
expectancy   = (winRateDec × avgWinR) − (lossRateDec × |avgLossR|)
maxDrawdownR = peak-to-trough decline of the cumulative R curve
```

Breakeven trades count toward the total but never toward wins or losses.
Metrics that cannot be meaningfully computed return `null` and display as
**N/A** in the UI — never NaN or Infinity.

---

## Running the unit tests

```bash
cd server
npm run test:calc
```

Zero-dependency tests (Node's built-in runner) covering R calculations,
position validation, summary metrics, profit-factor edge cases, drawdown,
grouping and monthly aggregation:

```
# tests 16
# pass 16
```

---

## Production build / preview

```bash
cd client
npm run build       # outputs to client/dist
npm run preview     # serve the built bundle locally
```

---

## Customisation notes

- Add new instruments in **two places**: the Mongoose enum in
  `server/models/Trade.js` and `client/src/constants/index.js`.
- Changing derived-metric behaviour? Edit `server/utils/calculations.js` and
  `server/utils/analytics.js` — the model, controllers and seed script all
  flow through them, so formulas are never duplicated.
- The client-side `src/utils/calculations.js` mirrors the server maths purely
  for the **live form preview**; the server remains authoritative.

---

## Security & scope

- No authentication — by design, for **personal local use only**. Do not
  deploy this publicly without adding your own auth layer.
- No broker integrations, no API keys, no external services contacted.
- Database credentials are read from environment variables only.

---

## License

MIT