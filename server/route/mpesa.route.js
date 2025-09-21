import { Router } from 'express';
import auth from '../middleware/auth.js';
import { initiateSTKPush, handleMpesaCallback, getMpesaStatus } from '../controllers/mpesa.controller.js';

const mpesaRouter = Router();

mpesaRouter.post('/stk-push', auth, initiateSTKPush);
mpesaRouter.post('/callback', handleMpesaCallback);
mpesaRouter.get('/status', auth, getMpesaStatus);

export default mpesaRouter;