import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import { getWarehouseInventory, receiveWarehouseStock, dispatchToShop } from '../controllers/warehouse.controller.js';

const router = Router();

// Backroom stock tracking, separate from the live shop's Product.stock.
// Every mutation here is logged to AdminActionLog.
router.get('/inventory', auth, admin, getWarehouseInventory);
router.post('/receive', auth, admin, receiveWarehouseStock);
router.post('/dispatch', auth, admin, dispatchToShop);

export default router;
