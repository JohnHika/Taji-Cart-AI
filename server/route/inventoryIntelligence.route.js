import { Router } from 'express';
import { admin } from '../middleware/Admin.js';
import auth from '../middleware/auth.js';
import {
  getAbcClassification,
  getAuditTrail,
  getDeadStockReport,
  getProductVelocity,
  getReplenishmentQueue,
  getSalesTrend,
  getSupplierScorecards,
  saveInventoryPolicy,
} from '../controllers/inventoryIntelligence.controller.js';

const router = Router();

router.get('/replenishment-queue', auth, admin, getReplenishmentQueue);
router.get('/sales-trend', auth, admin, getSalesTrend);
router.get('/supplier-scorecards', auth, admin, getSupplierScorecards);
router.get('/velocity/:productId', auth, admin, getProductVelocity);
router.post('/policy/:productId', auth, admin, saveInventoryPolicy);
router.get('/audit-trail', auth, admin, getAuditTrail);
router.get('/dead-stock', auth, admin, getDeadStockReport);
router.get('/abc-classification', auth, admin, getAbcClassification);

export default router;
