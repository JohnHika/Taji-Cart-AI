import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import { askAdminAi, getAdminAiBrief } from '../controllers/adminAi.controller.js';

const router = Router();

// /brief is always read-only (runs on page load, not a specific question).
// /ask may take capped, audited autonomous actions when
// ADMIN_AI_AUTONOMOUS_WRITES=true and the OpenAI provider is configured —
// see adminAi.controller.js for the tool allowlist and caps. Unset/false
// keeps this endpoint exactly as read-only as /brief.
router.get('/brief', auth, admin, getAdminAiBrief);
router.post('/ask', auth, admin, askAdminAi);

export default router;
