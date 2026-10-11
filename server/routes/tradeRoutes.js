import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createTrade,
  deleteTrade,
  exportTrades,
  getTradeById,
  getTrades,
  updateTrade,
} from '../controllers/tradeController.js';

const router = Router();

// Order matters: the export route must be registered before /:id.
router.get('/', asyncHandler(getTrades));
router.get('/export/csv', asyncHandler(exportTrades));
router.get('/:id', asyncHandler(getTradeById));
router.post('/', asyncHandler(createTrade));
router.put('/:id', asyncHandler(updateTrade));
router.delete('/:id', asyncHandler(deleteTrade));

export default router;