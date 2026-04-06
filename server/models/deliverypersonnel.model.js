import mongoose from "mongoose";

const deliveryPersonnelSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    profileImage: String,
    phoneNumber: String,
    currentLocation: {
        lat: Number,
        lng: Number,
        lastUpdated: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    activeOrdersCount: {
        type: Number,
        default: 0
    },
    lastActive: Date,
    activeOrders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'order'
    }],
    ratings: [{
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'order'
        },
        rating: Number,
        comment: String
    }],
    averageRating: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const DeliveryPersonnelModel = mongoose.model('DeliveryPersonnel', deliveryPersonnelSchema);

export default DeliveryPersonnelModel;
