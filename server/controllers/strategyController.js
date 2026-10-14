import Strategy from '../models/Strategy.js';
import Trade from '../models/Trade.js';
import { ApiError, NotFoundError } from '../utils/errors.js';

/**
 * GET /api/strategies
 * Returns all strategies with trade usage statistics (count, win rate, net R).
 */
export async function getStrategies(req, res) {
  const { search } = req.query;
  const filter = {};

  if (search && search.trim()) {
    const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: regex }, { details: regex }];
  }

  const strategies = await Strategy.find(filter).sort({ title: 1 }).lean();

  // Aggregate trade stats per strategy to enrich the list.
  const tradeStats = await Trade.aggregate([
    {
      $group: {
        _id: '$strategy',
        tradeCount: { $sum: 1 },
        wins: { $sum: { $cond: [{ $eq: ['$outcome', 'WIN'] }, 1, 0] } },
        netR: { $sum: '$actualR' },
      },
    },
  ]);

  const statsMap = new Map();
  for (const stat of tradeStats) {
    if (stat._id) {
      statsMap.set(stat._id.toLowerCase(), {
        tradeCount: stat.tradeCount,
        wins: stat.wins,
        winRate: stat.tradeCount > 0 ? Math.round((stat.wins / stat.tradeCount) * 100) : 0,
        netR: Math.round((stat.netR || 0) * 100) / 100,
      });
    }
  }

  const enriched = strategies.map((s) => {
    const stats = statsMap.get(s.title.toLowerCase()) || {
      tradeCount: 0,
      wins: 0,
      winRate: 0,
      netR: 0,
    };
    return {
      id: s._id.toString(),
      _id: s._id.toString(),
      title: s.title,
      details: s.details || '',
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      ...stats,
    };
  });

  res.json({ strategies: enriched });
}

/**
 * GET /api/strategies/:id
 */
export async function getStrategyById(req, res) {
  const strategy = await Strategy.findById(req.params.id);
  if (!strategy) throw new NotFoundError('Strategy not found.');
  res.json(strategy);
}

/**
 * POST /api/strategies
 */
export async function createStrategy(req, res) {
  const { title, details = '' } = req.body;
  if (!title || !title.trim()) {
    throw new ApiError(400, 'Strategy title is required.');
  }

  const trimmedTitle = title.trim();
  const existing = await Strategy.findOne({
    title: { $regex: new RegExp(`^${trimmedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  });

  if (existing) {
    throw new ApiError(409, `Strategy "${trimmedTitle}" already exists.`);
  }

  const strategy = await Strategy.create({
    title: trimmedTitle,
    details: details ? details.trim() : '',
  });

  res.status(201).json(strategy);
}

/**
 * PUT /api/strategies/:id
 */
export async function updateStrategy(req, res) {
  const strategy = await Strategy.findById(req.params.id);
  if (!strategy) throw new NotFoundError('Strategy not found.');

  const { title, details } = req.body;
  const oldTitle = strategy.title;

  if (title !== undefined) {
    if (!title || !title.trim()) {
      throw new ApiError(400, 'Strategy title cannot be empty.');
    }
    const trimmedTitle = title.trim();

    // Check duplicate if title changed
    if (trimmedTitle.toLowerCase() !== oldTitle.toLowerCase()) {
      const existing = await Strategy.findOne({
        _id: { $ne: strategy._id },
        title: { $regex: new RegExp(`^${trimmedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      if (existing) {
        throw new ApiError(409, `Strategy "${trimmedTitle}" already exists.`);
      }
    }
    strategy.title = trimmedTitle;
  }

  if (details !== undefined) {
    strategy.details = details ? details.trim() : '';
  }

  await strategy.save();

  // If title was renamed, keep existing trades synced with the new title
  if (title !== undefined && strategy.title !== oldTitle) {
    await Trade.updateMany({ strategy: oldTitle }, { $set: { strategy: strategy.title } });
  }

  res.json(strategy);
}

/**
 * DELETE /api/strategies/:id
 */
export async function deleteStrategy(req, res) {
  const strategy = await Strategy.findById(req.params.id);
  if (!strategy) throw new NotFoundError('Strategy not found.');

  await Strategy.findByIdAndDelete(req.params.id);
  res.status(204).send();
}
