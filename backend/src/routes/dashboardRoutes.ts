import express from 'express';
const router = express.Router();
import * as dashboardController from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

router.get('/:user_id', requireAuth as any, dashboardController.getDashboard);

export default router;
