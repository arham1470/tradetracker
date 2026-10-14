import { Router } from 'express';
import {
  createStrategy,
  deleteStrategy,
  getStrategies,
  getStrategyById,
  updateStrategy,
} from '../controllers/strategyController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(getStrategies));
router.post('/', asyncHandler(createStrategy));
router.get('/:id', asyncHandler(getStrategyById));
router.put('/:id', asyncHandler(updateStrategy));
router.delete('/:id', asyncHandler(deleteStrategy));

export default router;
