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
    wholesalePrice : {
        type : Number,
        min : 0,
        description: "Optional bulk/wholesale price in Ksh - must be lower than the retail price"
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

productSchema.index({ publish: 1, stock: 1 });
productSchema.index({ category: 1 });

// Sales Counter's barcode/QR/SKU scanner (server/routes/pos.js /products/lookup)
// matches case-insensitively on every scanned item. The unique indexes from
// `unique: true` above use default (case-sensitive) collation, so a
// case-insensitive regex match against them still falls back to a full
// collection scan. Strength 2 collation makes the index itself
// case-insensitive so an exact-match lookup is a true index seek.
const caseInsensitiveCollation = { locale: 'en', strength: 2 };
productSchema.index({ barcode: 1 }, { collation: caseInsensitiveCollation, name: 'barcode_ci', sparse: true });
productSchema.index({ qrCode: 1 }, { collation: caseInsensitiveCollation, name: 'qrCode_ci', sparse: true });
productSchema.index({ sku: 1 }, { collation: caseInsensitiveCollation, name: 'sku_ci', sparse: true });

const ProductModel = mongoose.model('product',productSchema)

export default ProductModel
