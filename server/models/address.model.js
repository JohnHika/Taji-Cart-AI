import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
    address_line : {
        type : String,
        default : ""
    },
    city : {
        type : String,
        default : ""
    },
    state : {
        type : String,
        default : ""
    },
    pincode : {
        type : String
    },
    country : {
        type : String
    },
    mobile : {
        type : Number,
        default : null
    },
    // GPS coordinates for map-based location (like Uber)
    coordinates : {
        lat : {
            type : Number,
            default : null
        },
        lng : {
            type : Number,
            default : null
        }
    },
    // Delivery instructions or landmarks
    deliveryInstructions : {
        type : String,
        default : ""
    },
    status : {
        type : Boolean,
        default : true
    },
    userId : {
        type : mongoose.Schema.ObjectId,
        default : ""
    }
},{
    timestamps : true
})

const AddressModel = mongoose.model('address',addressSchema)

export default AddressModel