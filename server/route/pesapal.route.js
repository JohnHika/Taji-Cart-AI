import express from 'express';
import { initiatePayment, handleCallback, getStatus } from '../controllers/pesapal.controller.js';
import { getAccessToken } from '../config/pesapal.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/initiate', auth, initiatePayment);
router.get('/callback', handleCallback);
router.get('/status/:trackingId', getStatus);

// Lightweight health check for env presence (no secrets exposed)
router.get('/health', (req, res) => {
	const notif = process.env.PESAPAL_NOTIFICATION_ID || '';
	res.json({
		status: 'ok',
		baseUrlSet: !!process.env.PESAPAL_BASE_URL,
		keySet: !!process.env.PESAPAL_CONSUMER_KEY,
		secretSet: !!process.env.PESAPAL_CONSUMER_SECRET,
		callbackUrlSet: !!process.env.PESAPAL_CALLBACK_URL,
		notificationIdPresent: !!notif,
		notificationIdLength: notif.length,
	});
});

	// Debug endpoint to verify token retrieval from Pesapal (no auth)
	router.get('/debug-token', async (req, res) => {
		try {
			const token = await getAccessToken();
			return res.json({ success: true, tokenPresent: !!token });
		} catch (err) {
			return res.status(500).json({
				success: false,
				message: err.message,
				details: err.response?.data || undefined,
			});
		}
	});

export default router;
