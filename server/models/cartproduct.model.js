import mongoose from "mongoose";

const cartProductSchema = new mongoose.Schema({
    productId : {
        type : mongoose.Schema.ObjectId,
        ref : 'product'
    },
    sku : {
        type : String,
        default : '',
        description: "Product SKU for barcode tracking"
    },
    quantity : {
        type : Number,
        default : 1
    },
    userId : {
        type : mongoose.Schema.ObjectId,
        ref : "User"
    },
    // Store selected variant details
    selectedVariant : {
        color : String,
        length : String,
        density : String,
        laceSpecification : String
    },
    selectedVariantKey : {
        type : String,
        default : ''
    }
},{
    timestamps : true
})

cartProductSchema.index(
    {
        userId : 1,
        productId : 1,
        sku : 1,
        selectedVariantKey : 1
    },
    {
        unique : true
    }
)

const CartProductModel = mongoose.model('cartProduct',cartProductSchema)

export default CartProductModel
