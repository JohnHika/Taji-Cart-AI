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
    phoneNumber: String,
    currentLocation: {
        lat: Number,
        lng: Number,
        lastUpdated: Date
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
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