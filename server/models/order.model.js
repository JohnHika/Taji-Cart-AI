import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    orderId: {
        type: String,
        required: [true, "Provide orderId"],
        unique: true
    },
    productId: {
        type: mongoose.Schema.ObjectId,
        ref: "product"
    },
    product_details: {
        name: String,
        image: Array,
    },
    paymentId: {
        type: String,
        default: ""
    },
    payment_status: {
        type: String,
        default: ""
    },
    delivery_address: {
        type: mongoose.Schema.ObjectId,
        ref: 'address'
    },
    subTotalAmt: {
        type: Number,
        default: 0
    },
    totalAmt: {
        type: Number,
        default: 0
    },
    invoice_receipt: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'driver_assigned', 'out_for_delivery', 'nearby', 'delivered', 'cancelled'],
        default: 'pending'
    },
    statusHistory: {
        type: [{
            status: {
                type: String,
                required: true,
                enum: ['pending', 'processing', 'shipped', 'driver_assigned', 'out_for_delivery', 'nearby', 'delivered', 'cancelled']
            },
            timestamp: {
                type: Date,
                default: Date.now
            },
            location: {
                lat: Number,
                lng: Number
            },
            note: String
        }],
        default: []
    },
    currentLocation: {
        lat: Number,
        lng: Number,
        lastUpdated: Date
    },
    estimatedDeliveryTime: Date,
    deliveryPersonnel: {
        type: mongoose.Schema.ObjectId,
        ref: 'DeliveryPersonnel'
    }
}, {
    timestamps: true
})

const OrderModel = mongoose.model('order', orderSchema)

export default OrderModel