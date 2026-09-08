import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import { getAdminAiBrief } from '../controllers/adminAi.controller.js';

const router = Router();

// Keep this surface deliberately small and read-only. The assistant can
// recommend a next step, but it must never make a commercial change itself.
router.get('/brief', auth, admin, getAdminAiBrief);

export default router;
