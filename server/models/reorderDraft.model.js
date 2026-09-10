import mongoose from 'mongoose';

// A restock suggestion the AI copilot or an admin can create. It never sends
// itself anywhere — the owner reviews and actions it manually, so there is
// no execution cap on this one the way there is on stock/price/order tools.
const reorderDraftSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true,
    },
    suggestedQuantity: {
        type: Number,
        required: true,
        min: 1,
    },
    reason: { type: String },
    createdBy: {
        type: String,
        enum: ['admin', 'ai'],
        required: true,
    },
    status: {
        type: String,
        enum: ['open', 'dismissed', 'ordered'],
        default: 'open',
    },
}, { timestamps: true });

const ReorderDraftModel = mongoose.model('ReorderDraft', reorderDraftSchema);

export default ReorderDraftModel;
