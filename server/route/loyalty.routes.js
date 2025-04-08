import express from 'express';
import {
    getBenefitRanges,
    getLoyaltyCards,
    getLoyaltyStats,
    getTierThresholds,
    getUserLoyaltyCard,
    refreshUserPoints,
    requestSecurityCode, // Add this import
    updateBenefitRanges,
    updateLoyaltyPoints,
    updateTierThresholds,
    validateLoyaltyCard
} from '../controllers/loyalty.controller.js';
import { admin } from '../middleware/Admin.js';
import auth from '../middleware/auth.js';

const loyaltyRouter = express.Router();

// Route for getting loyalty card directly under /api/loyalty
loyaltyRouter.get('/card/:userId', auth, getUserLoyaltyCard);

// Route for updating loyalty points
loyaltyRouter.post('/update-points', auth, updateLoyaltyPoints);

// Route for validating a loyalty card (public endpoint for in-store scanning)
loyaltyRouter.get('/validate/:cardNumber', validateLoyaltyCard);

// Security endpoint for requesting security codes for sensitive operations
loyaltyRouter.post('/request-security-code', auth, admin, requestSecurityCode);

// Add route for refreshing loyalty points
loyaltyRouter.post('/refresh-points', auth, admin, refreshUserPoints);

// Admin routes for loyalty program management
// Original route pattern (keeping for backwards compatibility)
loyaltyRouter.get('/admin/thresholds', auth, admin, getTierThresholds);
loyaltyRouter.put('/admin/thresholds', auth, admin, updateTierThresholds);

// New routes to match frontend requests at /api/admin/loyalty/...
// These will be registered at /api/loyalty/... in the server but can be
// accessed via both patterns depending on how they're registered in index.js
loyaltyRouter.get('/cards', auth, admin, getLoyaltyCards);
loyaltyRouter.get('/stats', auth, admin, getLoyaltyStats);
loyaltyRouter.get('/thresholds', auth, admin, getTierThresholds);
loyaltyRouter.put('/thresholds', auth, admin, updateTierThresholds);
loyaltyRouter.get('/benefit-ranges', auth, admin, getBenefitRanges);
loyaltyRouter.put('/benefit-ranges', auth, admin, updateBenefitRanges);

export default loyaltyRouter;