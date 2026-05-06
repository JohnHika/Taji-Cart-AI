import mongoose from "mongoose";

const driverFinancialSchema = new mongoose.Schema({
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryPersonnel',
        required: true,
        unique: true
    },

    // Earnings Tracking
    earnings: {
        total: {
            type: Number,
            default: 0
        },
        pending: {
            type: Number,
            default: 0
        },
        paid: {
            type: Number,
            default: 0
        }
    },

    // Commission History
    commissions: [{
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'order',
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        rate: {
            type: Number,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'cancelled'],
            default: 'pending'
        }
    }],

    // Payout History
    payouts: [{
        amount: {
            type: Number,
            required: true
        },
        method: {
            type: String,
            enum: ['mpesa', 'bank', 'cash'],
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'processed', 'failed', 'cancelled'],
            default: 'pending'
        },
        reference: {
            type: String,
            trim: true
        },
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        processedAt: {
            type: Date
        },
        notes: {
            type: String,
            trim: true
        }
    }],

    // Expense Tracking
    expenses: [{
        type: {
            type: String,
            enum: ['fuel', 'maintenance', 'insurance', 'other'],
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        receiptImage: {
            type: String,
            trim: true
        },
        date: {
            type: Date,
            default: Date.now
        },
        notes: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        }
    }],

    // Tax Information
    taxInfo: {
        kraPin: {
            type: String,
            trim: true
        },
        taxCompliance: {
            type: Boolean,
            default: false
        },
        lastTaxFiling: {
            type: Date
        }
    },

    // Payout Preferences
    payoutPreferences: {
        preferredMethod: {
            type: String,
            enum: ['mpesa', 'bank', 'cash'],
            default: 'mpesa'
        },
        mpesaNumber: {
            type: String,
            trim: true
        },
        bankDetails: {
            bankName: String,
            accountNumber: String,
            accountName: String,
            branch: String
        },
        minimumPayoutAmount: {
            type: Number,
            default: 500
        }
    }
}, {
    timestamps: true
});

const DriverFinancialModel = mongoose.model('DriverFinancial', driverFinancialSchema);

export default DriverFinancialModel;