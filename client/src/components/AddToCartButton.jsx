import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { FaMinus, FaPlus } from "react-icons/fa6"
import { useSelector } from 'react-redux'
import SummaryApi from '../common/SummaryApi'
import { useGlobalContext } from '../provider/GlobalProvider'
import Axios from '../utils/Axios'
import Loading from './Loading'

const buildVariantKey = (variant = {}) =>
    JSON.stringify({
        color: variant?.color || '',
        length: variant?.length || '',
        density: variant?.density || '',
        laceSpecification: variant?.laceSpecification || ''
    })

const AddToCartButton = ({ data, product: productProp, cartData, selectedVariant, sku, showText = true }) => {
    const { fetchCartItem, updateCartItem, deleteCartItem } = useGlobalContext()
    const [loading, setLoading] = useState(false)
    const [updateLoading, setUpdateLoading] = useState(false)
    const cartItem = useSelector(state => state.cartItem.cart)
    const [isAvailableCart, setIsAvailableCart] = useState(false)
    const [qty, setQty] = useState(0)
    const [cartItemDetails, setCartItemDetails] = useState()
    const user = useSelector(state => state.user)
    const addActionLockRef = useRef(false)
    const quantityActionLockRef = useRef(false)

    const product = data || productProp || cartData?.productId
    const normalizedSku = typeof sku === 'string' ? sku.trim() : ''
    const selectedVariantKey = buildVariantKey(selectedVariant)

    const isMatchingCartItem = (item) => {
        if (item.productId?._id !== product?._id) {
            return false
        }

        const itemSku = typeof item.sku === 'string' ? item.sku.trim() : ''

        if (normalizedSku || itemSku) {
            return itemSku === normalizedSku
        }

        return buildVariantKey(item.selectedVariant) === selectedVariantKey
    }

    const handleAddToCart = async (e) => {
        e.preventDefault()
        e.stopPropagation()

        if (addActionLockRef.current || loading) {
            return
        }

        if (!user?._id) {
            toast.error("Please log in to add items to cart")
            return
        }

        if (!product?._id) {
            toast.error("Product information is missing")
            return
        }

        const matchingItems = cartItem.filter(isMatchingCartItem)

        if (matchingItems.length > 0) {
            toast.error("Item already in cart")
            return
        }

        try {
            addActionLockRef.current = true
            setLoading(true)

            const payload = {
                productId: product._id,
                quantity: 1
            }

            if (normalizedSku) {
                payload.sku = normalizedSku
            }

            if (selectedVariant && Object.values(selectedVariant).some(value => value)) {
                payload.selectedVariant = selectedVariant
            }

            const response = await Axios({
                url: SummaryApi.addTocart.url,
                method: SummaryApi.addTocart.method,
                data: payload,
                requestLockKey: `cart:add:${user._id}:${product._id}:${normalizedSku}:${selectedVariantKey}`
            })

            if (response.data.success) {
                toast.success(response.data.message || "Item added to cart")
                await fetchCartItem()
            } else {
                toast.error(response.data.message || "Failed to add item to cart")
            }
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error("Session expired. Please log in again.")
            } else {
                const errorMessage = error.response?.data?.message || "Network error. Please try again."
                toast.error(errorMessage)
            }
        } finally {
            setLoading(false)
            addActionLockRef.current = false
        }
    }

    useEffect(() => {
        const productId = product?._id

        if (!productId) {
            setIsAvailableCart(false)
            setQty(0)
            setCartItemDetails(undefined)
            return
        }

        const found = cartItem.find(isMatchingCartItem)
        setIsAvailableCart(Boolean(found))
        setQty(found?.quantity || 0)
        setCartItemDetails(found)
    }, [product, cartItem, normalizedSku, selectedVariantKey])

    const increaseQty = async(e) => {
        e.preventDefault()
        e.stopPropagation()

        if (quantityActionLockRef.current || updateLoading || !cartItemDetails?._id) {
            return
        }

        try {
            quantityActionLockRef.current = true
            setUpdateLoading(true)
            const response = await updateCartItem(cartItemDetails._id, qty + 1)

            if(response?.success){
                toast.success("Quantity increased")
            }
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error("Session expired. Please log in again.")
            } else {
                toast.error("Failed to update quantity")
            }
        } finally {
            setUpdateLoading(false)
            quantityActionLockRef.current = false
        }
    }

    const decreaseQty = async(e) => {
        e.preventDefault()
        e.stopPropagation()

        if (quantityActionLockRef.current || updateLoading || !cartItemDetails?._id) {
            return
        }

        try {
            quantityActionLockRef.current = true
            setUpdateLoading(true)

            if(qty === 1){
                const response = await deleteCartItem(cartItemDetails._id)

                if(response?.success) {
                    toast.success("Item removed from cart")
                }
            } else {
                const response = await updateCartItem(cartItemDetails._id, qty - 1)

                if(response?.success){
                    toast.success("Quantity decreased")
                }
            }
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error("Session expired. Please log in again.")
            } else {
                toast.error("Failed to update quantity")
            }
        } finally {
            setUpdateLoading(false)
            quantityActionLockRef.current = false
        }
    }

    const clearCart = async() => {
        try {
            setLoading(true)

            for (const item of cartItem) {
                await deleteCartItem(item._id)
            }

            toast.success("Cart cleared for debugging")
            fetchCartItem()
        } catch (error) {
            toast.error("Failed to clear cart")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='w-full min-w-0 max-w-none sm:max-w-[120px] lg:max-w-[150px]'>
            {
                isAvailableCart ? (
                    <div className='flex w-full h-full bg-white dark:bg-gray-800 rounded-lg border border-pink-200 dark:border-pink-700 overflow-hidden shadow-sm'>
                        <button 
                            onClick={decreaseQty} 
                            disabled={updateLoading}
                            aria-label="Decrease quantity"
                            className='bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:from-pink-700 active:to-rose-700 text-white flex-1 w-full p-1.5 sm:p-2 flex items-center justify-center text-xs sm:text-sm touch-manipulation transition-all min-w-[24px]'
                        >
                            {updateLoading ? <Loading /> : <FaMinus size={10} />}
                        </button>

                        <div className='flex-1 w-full font-semibold px-1 sm:px-2 flex items-center justify-center text-xs sm:text-sm bg-pink-50 dark:bg-gray-700 dark:text-white min-w-[28px] border-x border-pink-200 dark:border-pink-700'>{qty}</div>

                        <button
                            onClick={increaseQty}
                            disabled={updateLoading}
                            aria-label="Increase quantity"
                            className='bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:from-pink-700 active:to-rose-700 text-white flex-1 w-full p-1.5 sm:p-2 flex items-center justify-center text-xs sm:text-sm touch-manipulation transition-all min-w-[24px]'
                        >
                            {updateLoading ? <Loading /> : <FaPlus size={10} />}
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleAddToCart}
                        disabled={loading || !product?._id}
                        className='bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:from-pink-700 active:to-rose-700 text-white px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-semibold w-full touch-manipulation transition-all shadow-sm hover:shadow-md'
                    >
                        {loading ? <Loading /> : (showText ? 'Add to Cart' : '+')}
                    </button>
                )
            }
        </div>
    )
}

export default AddToCartButton
