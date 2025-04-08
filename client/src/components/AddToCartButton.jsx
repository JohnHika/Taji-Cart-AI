import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { FaMinus, FaPlus } from "react-icons/fa6"
import { useSelector } from 'react-redux'
import SummaryApi from '../common/SummaryApi'
import { useGlobalContext } from '../provider/GlobalProvider'
import Axios from '../utils/Axios'
import Loading from './Loading'

const AddToCartButton = ({ data, showText = true }) => {
    const { fetchCartItem, updateCartItem, deleteCartItem } = useGlobalContext()
    const [loading, setLoading] = useState(false)
    const [updateLoading, setUpdateLoading] = useState(false)
    const cartItem = useSelector(state => state.cartItem.cart)
    const [isAvailableCart, setIsAvailableCart] = useState(false)
    const [qty, setQty] = useState(0)
    const [cartItemDetails, setCartItemDetails] = useState()
    const user = useSelector(state => state.user);

    const handleAddToCart = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if user is logged in
        if (!user?._id) {
            toast.error("Please log in to add items to cart");
            return;
        }
        
        // Check if product already exists in cart
        console.log("Cart items in Redux:", cartItem);
        console.log("Current product ID:", data._id);
        
        const matchingItems = cartItem.filter(item => 
            item.productId?._id === data._id
        );
        console.log("Matching items:", matchingItems);
        
        if (matchingItems.length > 0) {
            toast.error("Item already in cart");
            return;
        }

        try {
            setLoading(true);
            
            // Create the request payload
            const payload = {
                productId: data._id,
                quantity: 1
            };
            
            console.log("Add to cart payload:", payload);
            
            // Use direct URL and method reference instead of spreading SummaryApi
            const response = await Axios({
                url: SummaryApi.addTocart.url,
                method: SummaryApi.addTocart.method,
                data: payload
            });

            console.log("Add to cart response:", response.data);

            if (response.data.success) {
                toast.success(response.data.message || "Item added to cart");
                // Immediately fetch updated cart items
                await fetchCartItem();
            } else {
                toast.error(response.data.message || "Failed to add item to cart");
            }
        } catch (error) {
            console.error("Add to cart error:", error);
            
            if (error.response) {
                console.log("Error data:", error.response.data);
                console.log("Error status:", error.response.status);
                
                if (error.response.status === 401) {
                    toast.error("Session expired. Please log in again.");
                } else {
                    const errorMessage = error.response.data.message || 
                                      "Could not add item to cart";
                    toast.error(errorMessage);
                }
            } else {
                toast.error("Network error. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    // Check if item is in cart
    useEffect(() => {
        const checkingItem = cartItem.some(item => item.productId?._id === data?._id)
        setIsAvailableCart(checkingItem)

        const product = cartItem.find(item => item.productId?._id === data?._id)
        setQty(product?.quantity || 0)
        setCartItemDetails(product)
    }, [data, cartItem])

    const increaseQty = async(e) => {
        e.preventDefault()
        e.stopPropagation()
        
        try {
            setUpdateLoading(true)
            const response = await updateCartItem(cartItemDetails?._id, qty + 1)
            
            if(response?.success){
                toast.success("Quantity increased")
            }
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error("Session expired. Please log in again.");
            } else {
                toast.error("Failed to update quantity");
            }
        } finally {
            setUpdateLoading(false)
        }
    }

    const decreaseQty = async(e) => {
        e.preventDefault()
        e.stopPropagation()
        
        try {
            setUpdateLoading(true)
            if(qty === 1){
                const response = await deleteCartItem(cartItemDetails?._id)
                if(response?.success) {
                    toast.success("Item removed from cart")
                }
            } else {
                const response = await updateCartItem(cartItemDetails?._id, qty - 1)
                if(response?.success){
                    toast.success("Quantity decreased")
                }
            }
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error("Session expired. Please log in again.");
            } else {
                toast.error("Failed to update quantity");
            }
        } finally {
            setUpdateLoading(false)
        }
    }

    // Function to clear cart (for debugging) - can be removed
    const clearCart = async() => {
        try {
            setLoading(true);
            // If you have a clearCart API endpoint:
            // await Axios({
            //     ...SummaryApi.clearCart
            // });
            
            // Alternative: remove each item manually
            for (const item of cartItem) {
                await deleteCartItem(item._id);
            }
            
            toast.success("Cart cleared for debugging");
            fetchCartItem(); // Refresh cart data
        } catch (error) {
            toast.error("Failed to clear cart");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className='w-full max-w-[150px]'>
            {
                isAvailableCart ? (
                    <div className='flex w-full h-full'>
                        <button 
                            onClick={decreaseQty} 
                            disabled={updateLoading}
                            aria-label="Decrease quantity"
                            className='bg-green-600 hover:bg-green-700 text-white flex-1 w-full p-1 rounded flex items-center justify-center'
                        >
                            {updateLoading ? <Loading /> : <FaMinus />}
                        </button>

                        <p className='flex-1 w-full font-semibold px-1 flex items-center justify-center'>{qty}</p>

                        <button 
                            onClick={increaseQty} 
                            disabled={updateLoading}
                            aria-label="Increase quantity"
                            className='bg-green-600 hover:bg-green-700 text-white flex-1 w-full p-1 rounded flex items-center justify-center'
                        >
                            {updateLoading ? <Loading /> : <FaPlus />}
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={handleAddToCart} 
                        disabled={loading}
                        className='bg-green-600 hover:bg-green-700 text-white px-2 lg:px-4 py-1 rounded'
                    >
                        {loading ? <Loading /> : "Add"}
                    </button>
                )
            }
        </div>
    )
}

export default AddToCartButton
