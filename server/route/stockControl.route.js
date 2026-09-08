import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import { finalizeStockCount, getStockControlDashboard, startStockCount } from '../controllers/stockControl.controller.js';

const router = Router();
router.use(auth, admin);
router.get('/dashboard', getStockControlDashboard);
router.post('/counts', startStockCount);
router.post('/counts/:id/finalize', finalizeStockCount);

export default router;
