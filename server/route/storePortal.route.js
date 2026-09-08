import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import { createStorePortalHandoff, exchangeStorePortalHandoff } from '../controllers/storePortal.controller.js';

const router = Router();

// Issuing a handoff requires the primary site's authenticated admin session.
router.post('/launch', auth, admin, createStorePortalHandoff);
// Exchange is intentionally unauthenticated: the one-time, 60-second signed
// handoff is the credential, and it is consumed before a session token exists.
router.post('/exchange', exchangeStorePortalHandoff);

export default router;
