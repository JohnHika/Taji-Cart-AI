import mongoose from 'mongoose';

// Shared audit trail for every non-customer-initiated write: warehouse
// dispatch, receiving, and any AI-copilot tool call (executed or rejected).
// There was no equivalent anywhere in this codebase before — this is the
// one place to look to answer "what changed, who/what changed it, and why."
const adminActionLogSchema = new mongoose.Schema({
    actorType: {
        type: String,
        enum: ['admin', 'ai'],
        required: true,
    },
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    action: {
        type: String,
        required: true,
        description: "e.g. 'dispatch_stock', 'ai_adjust_stock', 'ai_adjust_stock_rejected'",
    },
    target: {
        model: { type: String },
        id: { type: mongoose.Schema.Types.ObjectId },
    },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String },
}, { timestamps: true });

adminActionLogSchema.index({ actorType: 1, createdAt: -1 });
adminActionLogSchema.index({ 'target.model': 1, 'target.id': 1, createdAt: -1 });

const AdminActionLogModel = mongoose.model('AdminActionLog', adminActionLogSchema);

export default AdminActionLogModel;
