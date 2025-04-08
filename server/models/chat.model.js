// filepath: c:\projects\EL ROI ONE HARDWARE AND ACCERSSORIES\server\models\chat.model.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow guest chats
  },
  userIdentifier: {
    type: String, // Could be user ID, email, or guest session ID
    required: true
  },
  messages: [messageSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => ({})
  }
}, { timestamps: true });

// Add index for faster queries
chatSessionSchema.index({ lastActive: -1 });
chatSessionSchema.index({ userIdentifier: 1 });
chatSessionSchema.index({ user: 1, isActive: 1 }); // Add this index for user-specific active session lookups

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

export default ChatSession;