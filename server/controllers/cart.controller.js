import CartProductModel from "../models/cartproduct.model.js";
import UserModel from "../models/user.model.js";
import ProductModel from '../models/product.model.js';
import { getCustomerProductFilter } from './catalogQuality.controller.js';

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

// A positive whole quantity, defaulting to 1 when absent or invalid.
const normalizeRequestedQuantity = (quantity) => {
    const parsed = Math.floor(Number(quantity))
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export const addToCartItemController = async(request,response)=>{
    try {
        const  userId = request.userId
        const { productId, sku, selectedVariant, quantity } = request.body
        const normalizedSku = normalizeText(sku)
        const normalizedSelectedVariant = normalizeSelectedVariant(selectedVariant)
        const selectedVariantKey = buildSelectedVariantKey(normalizedSelectedVariant)
        const requestedQty = normalizeRequestedQuantity(quantity)

        if(!productId){
            return response.status(402).json({
                message : "Provide productId",
                error : true,
                success : false
            })
        }

        const customerVisibleProduct = await ProductModel.findOne({
            _id: productId,
            ...(await getCustomerProductFilter())
        }).select('_id name stock')

        if (!customerVisibleProduct) {
            return response.status(404).json({
                message: 'This product is not currently available to customers',
                error: true,
                success: false
            })
        }

        // Cart lines never exceed stock — otherwise the order is only
        // rejected at checkout with a surprise "insufficient stock".
        const stock = Math.max(0, Number(customerVisibleProduct.stock) || 0)

        if (stock <= 0) {
            return response.status(400).json({
                message: `${customerVisibleProduct.name} is out of stock`,
                error: true,
                success: false
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

        // Already in the cart (e.g. a guest cart being merged in after login):
        // add to the existing line instead of rejecting it, capped at stock.
        if(checkItemCart){
            const currentQty = Number(checkItemCart.quantity) || 0
            const nextQty = Math.min(currentQty + requestedQty, stock)
            const capped = currentQty + requestedQty > stock

            if (nextQty !== currentQty) {
                checkItemCart.quantity = nextQty
                await checkItemCart.save()
            }

            return response.json({
                data : checkItemCart,
                message : capped
                    ? `Only ${stock} of ${customerVisibleProduct.name} in stock — your cart has ${nextQty}`
                    : "Cart quantity updated",
                capped,
                error : false,
                success : true
            })
        }

        const initialQty = Math.min(requestedQty, stock)
        const cartItem = new CartProductModel({
            quantity : initialQty,
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
            message : initialQty < requestedQty
                ? `Only ${stock} of ${customerVisibleProduct.name} in stock — added ${initialQty}`
                : "Item add successfully",
            capped : initialQty < requestedQty,
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
        }).populate({ path: 'productId', match: await getCustomerProductFilter() })

        return response.json({
            data : cartItem.filter((item) => item.productId),
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
        const requestedQty = Math.floor(Number(qty))

        if(!_id || !Number.isFinite(requestedQty) || requestedQty < 1){
            return response.status(400).json({
                message : "provide _id, qty"
            })
        }

        const cartItem = await CartProductModel.findOne({ _id : _id, userId : userId })

        if(!cartItem){
            return response.status(404).json({
                message : "Cart item not found",
                error : true,
                success : false
            })
        }

        const product = await ProductModel.findById(cartItem.productId).select('name stock').lean()
        const stock = Math.max(0, Number(product?.stock) || 0)
        const productName = product?.name || 'This product'
        const isDecrease = requestedQty < (Number(cartItem.quantity) || 0)

        // Cap at stock so the shortfall surfaces here, not at checkout.
        // Decreases always go through so an over-stock line can be brought
        // back down even when the product has since sold out.
        if (!isDecrease && stock <= 0) {
            return response.status(400).json({
                message : `${productName} is out of stock`,
                error : true,
                success : false
            })
        }

        const nextQty = stock > 0 ? Math.min(requestedQty, stock) : requestedQty
        const capped = nextQty < requestedQty

        await CartProductModel.updateOne({
            _id : _id,
            userId : userId
        },{
            quantity : nextQty
        })

        return response.json({
            message : capped
                ? `Only ${stock} of ${productName} in stock — quantity set to ${nextQty}`
                : "Update cart",
            capped,
            success : true,
            error : false,
            data : { _id : cartItem._id, quantity : nextQty, stock }
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
