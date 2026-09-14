import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import staff from '../middleware/Staff.js';
import { requireStaffPermission } from '../middleware/requireStaffPermission.js';
import {
  createStockTransfer,
  getAdminStockTransfers,
  getPendingStockTransfers,
  getStockTransferHistory,
  receiveStockTransfer,
  resolveStockTransfer,
} from '../controllers/stockTransfer.controller.js';

const router = Router();

// Admin release, monitoring, and discrepancy resolution.
router.post('/admin/transfers', auth, admin, createStockTransfer);
router.get('/admin/transfers', auth, admin, getAdminStockTransfers);
router.post('/admin/transfers/:id/resolve', auth, admin, resolveStockTransfer);

// Store staff can only see transfers addressed to their own branch and can only
// submit a physical receipt through the dedicated stock.receive permission.
router.get('/staff/transfers/pending', auth, staff, requireStaffPermission('stock.receive'), getPendingStockTransfers);
router.get('/staff/transfers/history', auth, staff, requireStaffPermission('stock.receive'), getStockTransferHistory);
router.post('/staff/transfers/:id/receive', auth, staff, requireStaffPermission('stock.receive'), receiveStockTransfer);

export default router;
