import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    // Parent product identification
    handle : {
        type : String,
        required : true,
        description: "Parent product name (e.g., brazilian-straight)"
    },
    name : {
        type : String,
        required : true,
        description: "Product title visible to customers"
    },
    
    // SKU and scan codes
    sku : {
        type : String,
        required : true,
        unique : true,
        sparse : true,
        trim: true,
        description: "Unique internal stock code for inventory tracking"
    },
    barcode : {
        type : String,
        unique : true,
        sparse : true,
        trim: true,
        description: "Printed product barcode value scanned at the sales counter"
    },
    qrCode : {
        type : String,
        unique : true,
        sparse : true,
        trim: true,
        description: "Printed product QR payload scanned at the sales counter"
    },
    
    // Hair product variants
    variants : {
        color : {
            type : String,
            description: "Variant color (e.g., #1B, #613)"
        },
        length : {
            type : String,
            description: "Variant length (e.g., 18\", 20\")"
        },
        density : {
            type : String,
            description: "Hair density/thickness (e.g., 150%, 180%)"
        },
        laceSpecification : {
            type : String,
            description: "Lace details (e.g., 13x4 HD, 5x5 Transparent)"
        }
    },
    
    // Images
    image : {
        type : Array,
        default : []
    },
    imageFilename : {
        type : String,
        description: "Main image filename for this variant"
    },
    
    // Categories
    category : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'category'
        }
    ],
    subCategory : [
        {
            type : mongoose.Schema.ObjectId,
            ref : 'subCategory'
        }
    ],
    
    // Pricing
    unit : {
        type : String,
        default : "piece"
    },
    costPrice : {
        type : Number,
        required : true,
        description: "Vendor cost in Ksh"
    },
    price : {
        type : Number,
        required : true,
        description: "Retail selling price in Ksh"
    },
    discount : {
        type : Number,
        default : 0
    },
    
    // Inventory
    stock : {
        type : Number,
        required : true,
        description: "Stock quantity available"
    },
    weight : {
        type : Number,
        description: "Weight in grams - used for shipping calculation"
    },
    
    // Description and details
    description : {
        type : String,
        default : ""
    },
    more_details : {
        type : Object,
        default : {}
    },
    
    // Publishing status
    publish : {
        type : Boolean,
        default : true
    },
    
    // Ratings
    ratings: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }],
    averageRating: {
        type: Number,
        default: 0
    }
},{
    timestamps : true
})

//create a text index
productSchema.index({
    name: "text",
    description: 'text'
}, {
    weights: {
        name: 10,
        handle: 8,
        description: 5
    },
    name: "ProductTextIndex"
});

const ProductModel = mongoose.model('product',productSchema)

export default ProductModel
