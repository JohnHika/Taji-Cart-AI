import { Router } from 'express';
import auth from '../middleware/auth.js';
import { initiateSTKPush, handleMpesaCallback } from '../controllers/mpesa.controller.js';

const mpesaRouter = Router();

mpesaRouter.post('/stk-push', auth, initiateSTKPush);
mpesaRouter.post('/callback', handleMpesaCallback);

export default mpesaRouter;