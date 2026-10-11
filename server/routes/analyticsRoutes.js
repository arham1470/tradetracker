import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  assertValidInstrument,
  getInstruments,
  getStrategies,
  getSummary,
} from '../controllers/analyticsController.js';

const router = Router();

router.use(assertValidInstrument);
router.get('/summary', asyncHandler(getSummary));
router.get('/instruments', asyncHandler(getInstruments));
router.get('/strategies', asyncHandler(getStrategies));

export default router;