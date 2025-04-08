import express from 'express';
import {
    addContribution,
    applyReward,
    contributeToCampaign,
    createCampaign,
    createCommunityPerk,
    deleteCampaign,
    getActiveCampaigns,
    getAllCampaigns,
    getCampaignById,
    getCampaignLeaderboard,
    getUserActiveRewards,
    getUserCampaigns,
    redeemCampaignReward,
    updateCampaign
} from '../controllers/communitycampaign.controller.js';
import { admin } from '../middleware/Admin.js';
import auth from '../middleware/auth.js';

const campaignRouter = express.Router();

// Public routes
campaignRouter.get('/campaigns/active', getActiveCampaigns);
campaignRouter.get('/campaigns/:id', getCampaignById);
campaignRouter.get('/campaigns', getAllCampaigns);

// User routes (require authentication)
campaignRouter.get('/campaigns/user/:userId', auth, getUserCampaigns);
campaignRouter.get('/campaigns/leaderboard/:campaignId', getCampaignLeaderboard);
campaignRouter.post('/campaigns/contribute', auth, contributeToCampaign);
campaignRouter.post('/campaigns/:campaignId/contribute', auth, addContribution);
campaignRouter.post('/campaigns/:campaignId/redeem', auth, redeemCampaignReward);

// Admin routes
campaignRouter.post('/campaigns', auth, admin, createCampaign);
campaignRouter.post('/campaigns/perks', auth, admin, createCommunityPerk);
campaignRouter.put('/campaigns/:id', auth, admin, updateCampaign);
campaignRouter.delete('/campaigns/:id', auth, admin, deleteCampaign);

// User rewards routes
campaignRouter.get('/campaigns/rewards/active', auth, getUserActiveRewards);
campaignRouter.post('/campaigns/rewards/:rewardId/apply', auth, applyReward);

export default campaignRouter;