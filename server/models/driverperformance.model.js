import mongoose from "mongoose";

const driverPerformanceSchema = new mongoose.Schema({
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryPersonnel',
        required: true,
        unique: true
    },

    // Current Performance Metrics
    currentMetrics: {
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
        customerRatings: [{
            rating: Number,
            comment: String,
            date: Date
        }],
        averageRating: {
            type: Number,
            default: 0
        },
        reliabilityScore: {
            type: Number,
            default: 100
        }
    },

    // Historical Performance Trends
    performanceHistory: [{
        month: {
            type: String,
            required: true
        },
        year: {
            type: Number,
            required: true
        },
        deliveriesCompleted: {
            type: Number,
            default: 0
        },
        onTimeRate: {
            type: Number,
            default: 0
        },
        averageRating: {
            type: Number,
            default: 0
        },
        averageDeliveryTime: {
            type: Number,
            default: 0
        },
        earnings: {
            type: Number,
            default: 0
        }
    }],

    // Performance Indicators
    performanceIndicators: {
        responseTime: {
            type: Number,
            default: 0
        },
        orderAcceptanceRate: {
            type: Number,
            default: 0
        },
        customerSatisfaction: {
            type: Number,
            default: 0
        },
        distanceEfficiency: {
            type: Number,
            default: 0
        }
    },

    // Achievement Badges
    badges: [{
        type: {
            type: String,
            enum: ['fastest', 'most_reliable', 'highest_rated', 'most_deliveries', 'perfect_attendance']
        },
        earnedAt: {
            type: Date
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],

    // Performance Notes
    performanceNotes: [{
        note: {
            type: String,
            required: true
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        date: {
            type: Date,
            default: Date.now
        }
    }],

    // Last Updated
    lastPerformanceUpdate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
driverPerformanceSchema.index({ 'currentMetrics.reliabilityScore': 1 });
driverPerformanceSchema.index({ driverId: 1 });

const DriverPerformanceModel = mongoose.model('DriverPerformance', driverPerformanceSchema);

export default DriverPerformanceModel;