import CartProductModel from "../models/cartproduct.model.js";
import UserModel from "../models/user.model.js";

const VARIANT_FIELDS = ['color', 'length', 'density', 'laceSpecification'];

const normalizeText = (value) => {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim();
};

const normalizeSelectedVariant = (selectedVariant) => {
    if (!selectedVariant || typeof selectedVariant !== 'object') {
        return null;
    }

    const normalizedVariant = VARIANT_FIELDS.reduce((accumulator, field) => {
        const value = normalizeText(selectedVariant[field]);

        if (value) {
            accumulator[field] = value;
        }

        return accumulator;
    }, {});

    return Object.keys(normalizedVariant).length ? normalizedVariant : null;
};

const buildSelectedVariantKey = (selectedVariant) => {
    if (!selectedVariant) {
        return '';
    }

    return JSON.stringify(
        VARIANT_FIELDS.reduce((accumulator, field) => {
            accumulator[field] = selectedVariant[field] || '';
            return accumulator;
        }, {})
    );
};

export const addToCartItemController = async(request,response)=>{
    try {
        const  userId = request.userId
        const { productId, sku, selectedVariant } = request.body
        const normalizedSku = normalizeText(sku)
        const normalizedSelectedVariant = normalizeSelectedVariant(selectedVariant)
        const selectedVariantKey = buildSelectedVariantKey(normalizedSelectedVariant)
        
        if(!productId){
            return response.status(402).json({
                message : "Provide productId",
                error : true,
                success : false
            })
        }

        // For products with SKU, check uniqueness in cart (same product with same variant)
        const skuCandidates = normalizedSku ? [normalizedSku] : ['', null]
        const variantKeyCandidates = selectedVariantKey ? [selectedVariantKey] : ['', null]

        let checkItemCart = await CartProductModel.findOne({
            userId : userId,
            productId : productId,
            sku : { $in : skuCandidates },
            selectedVariantKey : { $in : variantKeyCandidates }
        })

        if(!checkItemCart && normalizedSelectedVariant){
            checkItemCart = await CartProductModel.findOne({
                userId : userId,
                productId : productId,
                sku : { $in : skuCandidates },
                selectedVariant : normalizedSelectedVariant
            })
        }

        if(checkItemCart){
            return response.status(400).json({
                message : "Item already in cart",
                error : true,
                success : false
            })
        }

        const cartItem = new CartProductModel({
            quantity : 1,
            userId : userId,
            productId : productId,
            sku : normalizedSku,
            selectedVariant : normalizedSelectedVariant,
            selectedVariantKey
        })
        const save = await cartItem.save()

        const updateCartUser = await UserModel.updateOne({ _id : userId},{
            $push : { 
                shopping_cart : productId
            }
        })

        return response.json({
            data : save,
            message : "Item add successfully",
            error : false,
            success : true
        })

        
    } catch (error) {
        if (error?.code === 11000) {
            return response.status(400).json({
                message : "Item already in cart",
                error : true,
                success : false
            })
        }

        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const getCartItemController = async(request,response)=>{
    try {
        const userId = request.userId

        const cartItem =  await CartProductModel.find({
            userId : userId
        }).populate('productId')

        return response.json({
            data : cartItem,
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const updateCartItemQtyController = async(request,response)=>{
    try {
        const userId = request.userId 
        const { _id,qty } = request.body

        if(!_id ||  !qty){
            return response.status(400).json({
                message : "provide _id, qty"
            })
        }

        const updateCartitem = await CartProductModel.updateOne({
            _id : _id,
            userId : userId
        },{
            quantity : qty
        })

        return response.json({
            message : "Update cart",
            success : true,
            error : false, 
            data : updateCartitem
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const deleteCartItemQtyController = async(request,response)=>{
    try {
      const userId = request.userId // middleware
      const { _id } = request.body 
      
      if(!_id){
        return response.status(400).json({
            message : "Provide _id",
            error : true,
            success : false
        })
      }

      const deleteCartItem  = await CartProductModel.deleteOne({_id : _id, userId : userId })

      return response.json({
        message : "Item remove",
        error : false,
        success : true,
        data : deleteCartItem
      })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const clearCartController = async(request, response) => {
    try {
        const userId = request.userId;
        
        // Delete all cart items for this user
        await CartProductModel.deleteMany({ userId: userId });
        
        // Update user document to clear shopping_cart array
        await UserModel.findByIdAndUpdate(userId, {
            shopping_cart: []
        });
        
        return response.json({
            message: "Cart cleared successfully",
            error: false,
            success: true
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        });
    }
}
