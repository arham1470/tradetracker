import mongoose from 'mongoose';
import { computeTradeDerivatives, validatePosition } from '../utils/calculations.js';

export const INSTRUMENTS = ['EURUSD', 'XAUUSD', 'AUDUSD'];
export const DIRECTIONS = ['BUY', 'SELL'];
export const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
export const SESSIONS = ['ASIA', 'LONDON', 'NEW_YORK', 'OTHER'];
export const OUTCOMES = ['WIN', 'LOSS', 'BREAKEVEN'];

const tradeSchema = new mongoose.Schema(
  {
    instrument: {
      type: String,
      enum: INSTRUMENTS,
      required: [true, 'Instrument is required.'],
      index: true,
    },
    direction: {
      type: String,
      enum: DIRECTIONS,
      required: [true, 'Direction is required.'],
      uppercase: true,
    },
    tradeDate: {
      type: Date,
      required: [true, 'Trade date is required.'],
      index: true,
    },
    strategy: {
      type: String,
      required: [true, 'Strategy name is required.'],
      trim: true,
      maxlength: [80, 'Strategy name must be at most 80 characters.'],
      index: true,
    },
    timeframe: {
      type: String,
      enum: TIMEFRAMES,
      required: [true, 'Timeframe is required.'],
    },
    session: {
      type: String,
      enum: SESSIONS,
      required: [true, 'Trading session is required.'],
    },
    entryPrice: {
      type: Number,
      required: [true, 'Entry price is required.'],
      min: [0, 'Entry price must be positive.'],
    },
    stopLoss: {
      type: Number,
      required: [true, 'Stop-loss price is required.'],
      min: [0, 'Stop-loss must be positive.'],
    },
    takeProfit: {
      type: Number,
      min: [0, 'Take-profit must be positive.'],
      default: null,
    },
    exitPrice: {
      type: Number,
      required: [true, 'Exit price is required.'],
      min: [0, 'Exit price must be positive.'],
    },
    outcome: {
      type: String,
      enum: OUTCOMES,
      default: null,
    },
    actualR: {
      type: Number,
      default: null,
    },
    plannedRR: {
      type: Number,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes must be at most 2000 characters.'],
      default: '',
    },
    screenshotUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'Screenshot URL must be at most 500 characters.'],
      default: '',
    },
    isDemo: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret.__v;
        ret.id = ret._id ? ret._id.toString() : undefined;
        return ret;
      },
    },
  }
);

// Compound index used by the common instrument + date-range filters.
tradeSchema.index({ instrument: 1, tradeDate: -1 });

/**
 * Single authoritative calculation point (server-side only).
 * Client-submitted actualR / plannedRR / outcome are always ignored here —
 * the real values are recomputed before every save.
 */
tradeSchema.pre('validate', function recalculateDerived(next) {
  const requiredSet =
    this.direction != null && this.entryPrice != null && this.stopLoss != null && this.exitPrice != null;

  if (requiredSet) {
    const positionCheck = validatePosition(this.direction, this.entryPrice, this.stopLoss, this.takeProfit);
    if (!positionCheck.valid) {
      this.invalidate('stopLoss', positionCheck.error);
      return next();
    }

    const { actualR, plannedRR, outcome } = computeTradeDerivatives(
      this.direction,
      this.entryPrice,
      this.stopLoss,
      this.takeProfit,
      this.exitPrice
    );
    this.actualR = actualR;
    this.plannedRR = plannedRR;
    this.outcome = outcome;
  }

  next();
});

const Trade = mongoose.model('Trade', tradeSchema);
export default Trade;