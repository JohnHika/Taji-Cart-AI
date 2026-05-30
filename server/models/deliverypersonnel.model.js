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

    // Verification System
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    idNumber: {
        type: String,
        trim: true
    },
    idFrontImage: {
        type: String,
        trim: true
    },
    idBackImage: {
        type: String,
        trim: true
    },
    kraPin: {
        type: String,
        trim: true
    },
    vehicleDetails: {
        type: {
            type: String,
            enum: ['motorcycle', 'bicycle', 'car', 'van'],
            default: 'motorcycle'
        },
        registrationNumber: {
            type: String,
            trim: true
        },
        insuranceValidUntil: {
            type: Date
        },
        insuranceProvider: {
            type: String,
            trim: true
        }
    },
    licenseNumber: {
        type: String,
        trim: true
    },
    licenseExpiry: {
        type: Date
    },
    licenseFrontImage: {
        type: String,
        trim: true
    },
    verificationNotes: {
        type: String,
        trim: true
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: {
        type: Date
    },
    currentLocation: {
        lat: Number,
        lng: Number,
        lastUpdated: Date,
        accuracy: Number,
        speed: Number,
        heading: Number
    },

    // Route Optimization Data
    currentRoute: {
        startLocation: {
            lat: Number,
            lng: Number
        },
        waypoints: [{
            lat: Number,
            lng: Number,
            orderId: mongoose.Schema.Types.ObjectId
        }],
        endLocation: {
            lat: Number,
            lng: Number
        },
        estimatedDuration: Number,
        estimatedDistance: Number,
        optimizedAt: Date
    },

    // Delivery Zone
    assignedZone: {
        type: String,
        enum: ['north', 'south', 'east', 'west', 'central']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    isOnline: {
        type: Boolean,
        default: false
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
    },

    // Performance Analytics
    performanceMetrics: {
        onTimeDeliveries: {
            type: Number,
            default: 0
        },
        lateDeliveries: {
            type: Number,
            default: 0
        },
        cancelledDeliveries: {
            type: Number,
            default: 0
        },
        successfulDeliveries: {
            type: Number,
            default: 0
        },
        averageDeliveryTime: {
            type: Number,
            default: 0
        },
        distanceTraveled: {
            type: Number,
            default: 0
        },
        reliabilityScore: {
            type: Number,
            default: 100
        }
    },

    // Financial Tracking
    financials: {
        totalEarnings: {
            type: Number,
            default: 0
        },
        pendingEarnings: {
            type: Number,
            default: 0
        },
        paidEarnings: {
            type: Number,
            default: 0
        },
        lastPayoutDate: {
            type: Date
        },
        commissionRate: {
            type: Number,
            default: 10
        }
    }
}, {
    timestamps: true
});

const DeliveryPersonnelModel = mongoose.model('DeliveryPersonnel', deliveryPersonnelSchema);

export default DeliveryPersonnelModel;
