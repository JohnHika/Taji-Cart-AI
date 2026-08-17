import express from 'express';
import {
  cancelExchange,
  completeExchange,
  createExchange,
  listExchanges,
  markHairReceived,
  searchTransactions
} from '../controllers/exchange.controller.js';
import auth from '../middleware/auth.js';
import Staff from '../middleware/Staff.js';
import { requireStaffPermission } from '../middleware/requireStaffPermission.js';

const exchangeRouter = express.Router();

exchangeRouter.get('/search', auth, Staff, requireStaffPermission('exchange.manage'), searchTransactions);
exchangeRouter.get('/', auth, Staff, requireStaffPermission('exchange.manage'), listExchanges);
exchangeRouter.post('/', auth, Staff, requireStaffPermission('exchange.manage'), createExchange);
exchangeRouter.put('/:id/hair-received', auth, Staff, requireStaffPermission('exchange.manage'), markHairReceived);
exchangeRouter.put('/:id/complete', auth, Staff, requireStaffPermission('exchange.manage'), completeExchange);
exchangeRouter.put('/:id/cancel', auth, Staff, requireStaffPermission('exchange.manage'), cancelExchange);

export default exchangeRouter;
