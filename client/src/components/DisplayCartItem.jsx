import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { FaArrowRight, FaCaretRight, FaCrown, FaStore, FaTimes, FaTrash, FaTruck } from "react-icons/fa"
import { IoClose } from 'react-icons/io5'
import { useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import imageEmpty from '../assets/empty_cart.webp'
import { useTheme } from '../context/ThemeContext'
import { useGlobalContext } from '../provider/GlobalProvider'
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import AddToCartButton from './AddToCartButton'

const DisplayCartItem = ({close}) => {
    const { notDiscountTotalPrice, totalPrice, totalQty, royalCardData, royalDiscount, clearCartItems } = useGlobalContext()
    const cartItem = useSelector(state => state.cartItem.cart)
    const user = useSelector(state => state.user)
    const navigate = useNavigate()
    const [showClearConfirm, setShowClearConfirm] = useState(false)
    const [showFulfillmentModal, setShowFulfillmentModal] = useState(false)
    const { darkMode } = useTheme()
    
    // Pickup locations data
    const pickupLocations = [
        { name: 'Main Store', address: 'Taji Cart HQ, 123 Main Street, Nairobi' },
        { name: 'Westlands Branch', address: '456 Westlands Road, Westlands, Nairobi' },
        { name: 'Mombasa Road Store', address: '789 Mombasa Road, Nairobi' }
    ];

    const redirectToCheckoutPage = () => {
        if(user?._id){
            // Show fulfillment modal instead of directly navigating
            setShowFulfillmentModal(true)
            return
        }
        toast("Please Login")
    }
    
    // Handle fulfillment selection and continue to checkout
    const handleFulfillmentSelect = (fulfillmentData) => {
        // Navigate to checkout with fulfillment data
        navigate("/checkout", { 
            state: {
                fulfillmentMethod: fulfillmentData.fulfillment_type,
                pickupLocation: fulfillmentData.pickup_location,
                pickupInstructions: fulfillmentData.pickup_instructions
            }
        });
        
        // Close the cart drawer if needed
        if(close){
            close()
        }
    }

    const handleClearCart = async () => {
        try {
            await clearCartItems()
            toast.success("Cart has been cleared")
            setShowClearConfirm(false)
        } catch (error) {
            toast.error("Failed to clear cart")
            console.error("Clear cart error:", error)
        }
    }

    return (
        <section className='bg-neutral-900 fixed top-0 bottom-0 right-0 left-0 bg-opacity-70 z-50'>
            <div className='bg-white dark:bg-gray-800 w-full max-w-sm min-h-screen max-h-screen ml-auto transition-colors duration-200'>
                <div className='flex items-center p-4 shadow-md gap-3 justify-between bg-white dark:bg-gray-800 border-b dark:border-gray-700 transition-colors duration-200'>
                    <h2 className='font-semibold dark:text-white'>Cart</h2>
                    <Link to={"/"} className='lg:hidden dark:text-gray-300 hover:dark:text-white'>
                        <IoClose size={25}/>
                    </Link>
                    <button onClick={close} className='hidden lg:block dark:text-gray-300 hover:dark:text-white'>
                        <IoClose size={25}/>
                    </button>
                </div>

                <div className='min-h-[75vh] lg:min-h-[80vh] h-full max-h-[calc(100vh-150px)] bg-blue-50 dark:bg-gray-900 p-2 flex flex-col gap-4 transition-colors duration-200'>
                    {/***display items */}
                    {
                        cartItem?.length > 0 ? (
                            <>
                                <div className='flex items-center justify-between px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-300 rounded-full transition-colors duration-200'>
                                    <p>Your total savings</p>
                                    <p>{DisplayPriceInShillings(notDiscountTotalPrice - totalPrice)}</p>
                                </div>
                                
                                {/* Show Royal Card discount badge if active */}
                                {royalDiscount > 0 && (
                                    <div className='flex items-center justify-between px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full transition-colors duration-200'>
                                        <div className='flex items-center'>
                                            <FaCrown className="mr-2" />
                                            <p>Royal {royalCardData?.tier} discount</p>
                                        </div>
                                        <p className='font-medium'>{royalDiscount}% off</p>
                                    </div>
                                )}
                                
                                <div className='bg-white dark:bg-gray-800 rounded-lg p-4 grid gap-5 overflow-auto transition-colors duration-200'>
                                    {
                                        cartItem?.length > 0 && (
                                            cartItem.map((item,index)=>{
                                                // Calculate prices
                                                const originalPrice = item?.productId?.price;
                                                const discountPercentage = item?.productId?.discount || 0;
                                                
                                                // Calculate price after product discount only
                                                const productDiscountAmount = Math.ceil((originalPrice * discountPercentage) / 100);
                                                const priceAfterProductDiscount = originalPrice - productDiscountAmount;
                                                
                                                // Calculate final price after both discounts
                                                const finalPrice = pricewithDiscount(originalPrice, discountPercentage, royalDiscount);
                                                
                                                // Calculate how much was saved from royal discount specifically
                                                const royalDiscountAmount = priceAfterProductDiscount - finalPrice;
                                                
                                                return(
                                                    <div key={item?._id || index} className='flex w-full gap-4'>
                                                        <div className='w-16 h-16 min-h-16 min-w-16 bg-red-500 border rounded dark:border-gray-600'>
                                                            <img
                                                                src={item?.productId?.image[0]}
                                                                className='object-scale-down'
                                                            />
                                                        </div>
                                                        <div className='w-full max-w-sm text-xs'>
                                                            <p className='text-xs text-ellipsis line-clamp-2 dark:text-white'>{item?.productId?.name}</p>
                                                            <p className='text-neutral-400 dark:text-gray-400'>{item?.productId?.unit}</p>
                                                            
                                                            <div className='flex items-center'>
                                                                <p className='font-semibold dark:text-white'>{DisplayPriceInShillings(finalPrice)}</p>
                                                                
                                                                {/* Show original price if any discount */}
                                                                {(discountPercentage > 0 || royalDiscount > 0) && (
                                                                    <p className='text-neutral-400 dark:text-gray-400 line-through text-[10px] ml-1'>
                                                                        {DisplayPriceInShillings(originalPrice)}
                                                                    </p>
                                                                )}

                                                                {/* Show royal discount if applicable */}
                                                                {royalDiscount > 0 && royalDiscountAmount > 0 && (
                                                                    <span className="ml-2 text-[10px] text-amber-600 dark:text-amber-400 flex items-center">
                                                                        <FaCrown className="mr-1 text-[10px]" />
                                                                        {royalDiscount}% off
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Show savings breakdown if there are multiple discounts */}
                                                            {discountPercentage > 0 && royalDiscount > 0 && (
                                                                <div className="text-[10px] text-green-600 dark:text-green-400 mt-1">
                                                                    Saved: {DisplayPriceInShillings(productDiscountAmount)} 
                                                                    {royalDiscountAmount > 0 && (
                                                                        <span> + <span className="text-amber-600 dark:text-amber-400">{DisplayPriceInShillings(royalDiscountAmount)}</span></span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            
                                                            <AddToCartButton product={item.productId} id={item?.id} cartData={item} />
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )
                                    }
                                </div>

                                <div className='fixed w-full max-w-sm bg-white dark:bg-gray-800 inset-x-0 bottom-0 border-t-2 dark:border-gray-700 p-3 transition-colors duration-200'>
                                    <div className='flex justify-between px-1 mb-2 text-sm dark:text-white'>
                                        <p>{totalQty} items</p>
                                        <p>Total: {DisplayPriceInShillings(totalPrice)}</p>
                                    </div>
                                    
                                    {notDiscountTotalPrice > totalPrice && (
                                        <div className='flex justify-between px-1 mb-2 text-xs text-green-600 dark:text-green-400'>
                                            <p>Your total savings:</p>
                                            <p>{DisplayPriceInShillings(notDiscountTotalPrice - totalPrice)}</p>
                                        </div>
                                    )}
                                    
                                    {royalDiscount > 0 && (
                                        <div className='flex justify-between px-1 mb-2 text-xs text-amber-600 dark:text-amber-400'>
                                            <p className='flex items-center'>
                                                <FaCrown className="mr-1" />
                                                {royalCardData?.tier} tier benefit:
                                            </p>
                                            <p>{royalDiscount}% discount applied</p>
                                        </div>
                                    )}
                                    
                                    <div className='flex gap-2 mt-2'>
                                        <button 
                                            onClick={() => setShowClearConfirm(true)} 
                                            className='py-2 px-3 border border-red-500 text-red-500 dark:border-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md flex items-center justify-center gap-1 transition-colors duration-200'>
                                            <FaTrash size={14} />
                                            <p>Clear All</p>
                                        </button>
                                        
                                        <button 
                                            onClick={redirectToCheckoutPage} 
                                            className='flex-1 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-md flex items-center justify-center gap-1 transition-colors duration-200'>
                                            <p>Checkout</p>
                                            <FaCaretRight/>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )
                        :
                        (
                            <div className='flex flex-col items-center justify-center h-full'>
                                <img 
                                    src={imageEmpty}
                                    alt="Empty Cart"
                                    className='w-40 h-40 object-contain'
                                />
                                <h1 className='font-medium dark:text-white'>Empty Cart</h1>
                                <p className='text-xs text-neutral-500 dark:text-gray-400 mx-5 text-center'>
                                    Your cart is currently empty. Add items to start shopping!
                                </p>
                            </div>
                        )
                    }
                </div>
            </div>

            {/* Fulfillment Modal */}
            {showFulfillmentModal && (
                <FulfillmentModal 
                    isOpen={showFulfillmentModal}
                    onClose={() => setShowFulfillmentModal(false)}
                    onSelect={handleFulfillmentSelect}
                    pickupLocations={pickupLocations}
                />
            )}
            
            {/* Clear Cart Confirmation Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold mb-3 dark:text-white">Clear Cart</h3>
                        <p className="mb-4 text-gray-600 dark:text-gray-300">Are you sure you want to remove all items from your cart?</p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setShowClearConfirm(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleClearCart}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                            >
                                Clear Cart
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

// Fulfillment Modal Component
const FulfillmentModal = ({ isOpen, onClose, onSelect, pickupLocations = [] }) => {
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [pickupInstructions, setPickupInstructions] = useState('');
    
    if (!isOpen) return null;
    
    const handleSelect = () => {
        if (!selectedMethod) {
            return;
        }
        
        if (selectedMethod === 'pickup' && !selectedLocation) {
            toast.error('Please select a pickup location');
            return;
        }
        
        onSelect({
            fulfillment_type: selectedMethod,
            pickup_location: selectedMethod === 'pickup' ? selectedLocation : '',
            pickup_instructions: selectedMethod === 'pickup' ? pickupInstructions : ''
        });
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full transition-colors duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold dark:text-white">Choose Fulfillment Method</h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                    >
                        <FaTimes />
                    </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                        onClick={() => setSelectedMethod('delivery')}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${
                            selectedMethod === 'delivery'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        <FaTruck className={`text-3xl mb-2 ${selectedMethod === 'delivery' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`} />
                        <span className={`font-medium ${selectedMethod === 'delivery' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            Delivery
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                            We'll deliver to your address
                        </p>
                    </button>
                    
                    <button
                        onClick={() => setSelectedMethod('pickup')}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${
                            selectedMethod === 'pickup'
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-400'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        <FaStore className={`text-3xl mb-2 ${selectedMethod === 'pickup' ? 'text-purple-500' : 'text-gray-500 dark:text-gray-400'}`} />
                        <span className={`font-medium ${selectedMethod === 'pickup' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            Pickup
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                            Pick up from our store
                        </p>
                    </button>
                </div>
                
                {selectedMethod === 'pickup' && (
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                            Select Pickup Location
                        </label>
                        <select 
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
                            required
                        >
                            <option value="">-- Select a location --</option>
                            {pickupLocations.map((location, index) => (
                                <option key={index} value={location.address}>
                                    {location.name} - {location.address}
                                </option>
                            ))}
                        </select>
                        
                        <label className="block text-sm font-medium mb-2 mt-4 dark:text-gray-200">
                            Pickup Instructions (optional)
                        </label>
                        <textarea
                            value={pickupInstructions}
                            onChange={(e) => setPickupInstructions(e.target.value)}
                            placeholder="Any special instructions for pickup..."
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 dark:text-gray-200"
                            rows="3"
                        />
                    </div>
                )}
                
                <button
                    onClick={handleSelect}
                    disabled={!selectedMethod || (selectedMethod === 'pickup' && !selectedLocation)}
                    className={`w-full py-2 px-4 rounded flex items-center justify-center transition-colors ${
                        selectedMethod && !(selectedMethod === 'pickup' && !selectedLocation)
                            ? selectedMethod === 'delivery' 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                >
                    Continue to Checkout <FaArrowRight className="ml-2" />
                </button>
            </div>
        </div>
    );
};

export default DisplayCartItem
