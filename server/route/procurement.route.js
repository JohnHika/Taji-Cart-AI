import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import {
  createPurchaseOrder,
  createSupplier,
  getProcurementDashboard,
  listSuppliers,
  markPurchaseOrderOrdered,
  receivePurchaseOrder,
} from '../controllers/procurement.controller.js';

const router = Router();

router.use(auth, admin);
router.get('/dashboard', getProcurementDashboard);
router.get('/suppliers', listSuppliers);
router.post('/suppliers', createSupplier);
router.post('/purchase-orders', createPurchaseOrder);
router.post('/purchase-orders/:id/order', markPurchaseOrderOrdered);
router.post('/purchase-orders/:id/receive', receivePurchaseOrder);

export default router;
