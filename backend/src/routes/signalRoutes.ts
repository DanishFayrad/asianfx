import express from 'express';
const router = express.Router();
import * as signalController from '../controllers/signalController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

router.get('/dashboard', signalController.getSignalsDashboard);
router.post('/create', [requireAuth as any, requireAdmin as any], signalController.createSignal);
router.post('/take', requireAuth as any, signalController.takeSignal);
router.get('/user/:user_id/history', requireAuth as any, signalController.getUserSignalHistory);

export default router;
