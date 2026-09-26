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
    },
    // Pay on Delivery is only offered inside Nairobi County. A zone has to be
    // marked as inside (default false) before bike deliveries to it can be
    // paid on delivery; the customer's map pin is checked too
    // (utils/nairobiCounty.js).
    inNairobiCounty: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

const DeliveryZoneModel = mongoose.model('deliveryZone', deliveryZoneSchema)

export default DeliveryZoneModel
