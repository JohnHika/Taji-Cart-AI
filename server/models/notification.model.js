import mongoose from 'mongoose';

const NOTIFICATION_TYPES = [
    'low_stock',
    'order_placed',
    'payment_received',
    'order_shipped',
    'loyalty_points',
    'order_update',
    'new_delivery',
    'community_reward',
    'community_achievement',
    'signup_bonus'
];

const notificationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: NOTIFICATION_TYPES
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    forAdmin: {
        type: Boolean,
        default: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, {
    timestamps: true
});

const NotificationModel = mongoose.model('Notification', notificationSchema);

export default NotificationModel;