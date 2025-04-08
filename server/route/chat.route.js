import express from 'express';
import {
    closeChatSession,
    getAllChatSessions,
    getChatSessionById,
    getPaginatedChatMessages,
    processMessage,
    processMessageStream,
    refreshChatCache,
    transcribeAudio
} from '../controllers/chat.controller.js';

const router = express.Router();

// Make transcribe route accessible without auth
router.post('/transcribe', transcribeAudio);

// Chat message endpoints
router.post('/message', processMessage);
router.post('/message/stream', processMessageStream);

// Optional authentication for these routes
router.post('/refresh-cache', refreshChatCache);
router.get('/sessions', getAllChatSessions);
router.get('/sessions/:id', getChatSessionById);
router.put('/sessions/:id/close', closeChatSession);
router.patch('/sessions/:id/close', closeChatSession);
router.get('/sessions/:id/messages', getPaginatedChatMessages);

export default router;