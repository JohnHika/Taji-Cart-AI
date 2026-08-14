import mongoose from "mongoose";

const deliveryZoneSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Provide zone name"],
        trim: true
    },
    corridor: {
        type: String,
        required: [true, "Provide corridor"],
        trim: true
    },
    fare: {
        type: Number,
        required: [true, "Provide fare"],
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
})

const DeliveryZoneModel = mongoose.model('deliveryZone', deliveryZoneSchema)

export default DeliveryZoneModel
