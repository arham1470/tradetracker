import Trade from '../models/Trade.js';
import { ApiError, NotFoundError } from '../utils/errors.js';

/** Whitelist of fields the API accepts from clients. */
const CREATABLE_FIELDS = [
  'instrument',
  'direction',
  'tradeDate',
  'strategy',
  'timeframe',
  'session',
  'entryPrice',
  'stopLoss',
  'takeProfit',
  'exitPrice',
  'notes',
  'screenshotUrl',
];

/** Trim a payload to only the whitelisted fields, normalising empties. */
function pickTradeInput(body) {
  const picked = {};
  for (const field of CREATABLE_FIELDS) {
    const value = body[field];
    if (value === undefined || value === null || value === '') continue;
    picked[field] = value;
  }
  if (picked.strategy != null) picked.strategy = String(picked.strategy).trim();
  return picked;
}

/** Convert a query-string value into a Date or return undefined. */
function parseDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Build a reusable Mongo filter from supported query params. */
function buildFilters({ instrument, outcome, strategy, startDate, endDate, search }) {
  const filter = {};

  if (instrument) filter.instrument = instrument;
  if (outcome) filter.outcome = outcome;
  if (strategy) filter.strategy = strategy;

  const from = parseDate(startDate);
  const to = parseDate(endDate);
  if (from || to) {
    filter.tradeDate = {};
    if (from) filter.tradeDate.$gte = new Date(from.setHours(0, 0, 0, 0));
    if (to) filter.tradeDate.$lte = new Date(to.setHours(23, 59, 59, 999));
  }

  if (search && search.trim()) {
    const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { strategy: regex },
      { notes: regex },
      { instrument: regex },
      { session: regex },
    ];
  }

  return filter;
}

/**
 * GET /api/trades
 * Returns `{ trades, pagination }` with filtering and sorting support:
 *   ?instrument= &outcome= &strategy= &search=
 *   &startDate= &endDate=
 *   &sort=actualR|tradeDate|netR&order=asc|desc
 *   &page=1&limit=20
 */
export async function getTrades(req, res) {
  const { sort = 'tradeDate', order = 'desc' } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const filter = buildFilters(req.query);
  const sortDirection = order === 'asc' ? 1 : -1;

  // netR sort needs a running-total window with an explicit sortBy inside the
  // same stage (MongoDB requires sortBy for document-based windows).
  const sortStage =
    sort === 'netR'
      ? [
          {
            $setWindowFields: {
              sortBy: { tradeDate: sortDirection, _id: sortDirection },
              output: { netR: { $sum: '$actualR', window: { documents: ['unbounded', 'current'] } } },
            },
          },
          { $sort: { netR: sortDirection } },
        ]
      : [{ $sort: { [sort]: sortDirection, _id: sortDirection } }];

  const pipeline = [
    { $match: filter },
    {
      $facet: {
        metadata: [{ $count: 'totalCount' }],
        documents: [
          ...sortStage,
          { $skip: (page - 1) * limit },
          { $limit: limit },
          // Aggregate output is raw BSON (no toJSON transform), so expose `id`
          // consistently with the rest of the API.
          { $addFields: { id: { $toString: '$_id' } } },
        ],
      },
    },
  ];

  const [result] = await Trade.aggregate(pipeline);
  const totalCount = result.metadata[0]?.totalCount ?? 0;
  const trades = result.documents;

  res.json({
    trades,
    pagination: {
      page,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
  });
}

/** GET /api/trades/:id */
export async function getTradeById(req, res) {
  const trade = await Trade.findById(req.params.id);
  if (!trade) throw new NotFoundError('Trade not found.');
  res.json(trade);
}

/** GET /api/trades/export/csv — returns a CSV download of all matching trades. */
export async function exportTrades(req, res) {
  const filter = buildFilters(req.query);
  const trades = await Trade.find(filter).sort({ tradeDate: -1, _id: -1 });

  const headers = [
    'tradeDate', 'instrument', 'direction', 'strategy', 'timeframe', 'session',
    'entryPrice', 'stopLoss', 'takeProfit', 'exitPrice', 'outcome',
    'actualR', 'plannedRR', 'notes', 'screenshotUrl', 'isDemo',
  ];

  const escapeCsv = (value) => {
    if (value == null) return '';
    const string = String(value);
    return /[",\n]/.test(string) ? `"${string.replace(/"/g, '""')}"` : string;
  };

  const rows = trades.map((trade) =>
    headers
      .map((header) => {
        if (header === 'tradeDate') return trade.tradeDate.toISOString().slice(0, 10);
        const value = trade.get(header);
        return escapeCsv(value);
      })
      .join(',')
  );

  const csv = [headers.join(','), ...rows].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="tradetracker-trades.csv"');
  res.status(200).send(csv);
}

/** POST /api/trades */
export async function createTrade(req, res) {
  const input = pickTradeInput(req.body);
  if (Object.keys(input).length === 0) {
    throw new ApiError(400, 'No valid trade fields were provided.');
  }
  const trade = await Trade.create(input);
  res.status(201).json(trade);
}

/** PUT /api/trades/:id */
export async function updateTrade(req, res) {
  const trade = await Trade.findById(req.params.id);
  if (!trade) throw new NotFoundError('Trade not found.');

  const input = pickTradeInput(req.body);
  trade.set(input);
  await trade.save();
  res.json(trade);
}

/** DELETE /api/trades/:id */
export async function deleteTrade(req, res) {
  const trade = await Trade.findByIdAndDelete(req.params.id);
  if (!trade) throw new NotFoundError('Trade not found.');
  res.status(204).send();
}