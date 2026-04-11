import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { FaArrowRight, FaCaretRight, FaCrown, FaStore, FaTimes, FaTrash, FaTruck } from "react-icons/fa"
import { IoClose } from 'react-icons/io5'
import { useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import imageEmpty from '../assets/empty_cart.webp'
import { nawiriBrand } from '../config/brand'
import { useGlobalContext } from '../provider/GlobalProvider'
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings'
import { pricewithDiscount } from '../utils/PriceWithDiscount'
import AddToCartButton from './AddToCartButton'

const DisplayCartItem = ({ close, variant = 'drawer' }) => {
    const isEmbedded = variant === 'embedded'
    const { notDiscountTotalPrice, totalPrice, totalQty, royalCardData, royalDiscount, clearCartItems } = useGlobalContext()
    const cartItem = useSelector(state => state.cartItem.cart)
    const user = useSelector(state => state.user)
    const navigate = useNavigate()
    const [showClearConfirm, setShowClearConfirm] = useState(false)
    const [showFulfillmentModal, setShowFulfillmentModal] = useState(false)
    
    // Pickup locations data
    const pickupLocations = [
        { name: 'Main Store', address: nawiriBrand.location },
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
        navigate("/dashboard/checkout", { 
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

    const innerShellClass = isEmbedded
        ? 'flex w-full max-w-4xl mx-auto flex-col overflow-hidden rounded-xl border border-brown-100 dark:border-dm-border bg-white dark:bg-dm-card shadow-sm min-h-[min(70vh,640px)] max-h-[calc(100dvh-10rem)] lg:max-h-[calc(100dvh-6rem)]'
        : 'bg-white dark:bg-dm-card w-full max-w-full sm:max-w-sm h-[100dvh] ml-auto transition-colors duration-200 flex flex-col'

    const innerBody = (
            <>
                <div className='flex items-center p-4 shadow-md gap-3 justify-between bg-white dark:bg-dm-card border-b border-brown-100 dark:border-dm-border transition-colors duration-200'>
                    <h2 className='font-semibold dark:text-white'>Cart</h2>
                    {!isEmbedded && (
                      <>
                    <Link to={"/"} className='lg:hidden dark:text-white/55 hover:dark:text-white'>
                        <IoClose size={25}/>
                    </Link>
                    <button type="button" onClick={close} className="hidden lg:block p-1 rounded-lg text-brown-500 dark:text-white/60 hover:text-plum-700 dark:hover:text-plum-200 transition-colors" aria-label="Close cart">
                        <IoClose size={25}/>
                    </button>
                      </>
                    )}
                </div>

                <div className='flex-1 min-h-0 bg-plum-50/60 dark:bg-dm-surface p-2 flex flex-col gap-4 transition-colors duration-200 overflow-hidden'>
                    {/***display items */}
                    {
                        cartItem?.length > 0 ? (
                            <>
                                <div className="flex items-center justify-between px-4 py-2.5 bg-gold-100/80 dark:bg-gold-600/15 text-gold-700 dark:text-gold-300 rounded-pill text-sm font-medium border border-gold-200/60 dark:border-gold-500/30">
                                    <p>Your total savings</p>
                                    <p>{DisplayPriceInShillings(notDiscountTotalPrice - totalPrice)}</p>
                                </div>

                                {royalDiscount > 0 && (
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-plum-50 dark:bg-plum-900/40 text-plum-800 dark:text-plum-200 rounded-pill text-sm border border-plum-200 dark:border-plum-700">
                                        <div className='flex items-center'>
                                            <FaCrown className="mr-2" />
                                            <p>Royal {royalCardData?.tier} discount</p>
                                        </div>
                                        <p className='font-medium'>{royalDiscount}% off</p>
                                    </div>
                                )}
                                
                                <div className='bg-white dark:bg-dm-card rounded-lg p-4 grid gap-5 overflow-auto transition-colors duration-200 flex-1 min-h-0 pb-28 border border-brown-100/80 dark:border-dm-border'>
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
                                                    <div key={item?._id || index} className="flex w-full gap-3 pb-4 border-b border-brown-100 dark:border-dm-border last:border-0 last:pb-0">
                                                        <div className="w-16 h-16 min-h-16 min-w-16 rounded-card bg-blush-50 dark:bg-dm-card-2 border border-brown-100 dark:border-dm-border overflow-hidden flex items-center justify-center">
                                                            <img
                                                                src={item?.productId?.image[0]}
                                                                alt=""
                                                                className="w-full h-full object-contain"
                                                            />
                                                        </div>
                                                        <div className="w-full max-w-sm text-xs min-w-0">
                                                            <p className="text-xs font-medium text-charcoal dark:text-white line-clamp-2">{item?.productId?.name}</p>
                                                            <p className="text-brown-400 dark:text-white/45 mt-0.5">{item?.productId?.unit}</p>

                                                            <div className="flex items-center flex-wrap gap-1 mt-1">
                                                                <p className="font-semibold font-price text-gold-600 dark:text-gold-300">{DisplayPriceInShillings(finalPrice)}</p>
                                                                {(discountPercentage > 0 || royalDiscount > 0) && (
                                                                    <p className="text-brown-300 dark:text-white/35 line-through text-[10px]">
                                                                        {DisplayPriceInShillings(originalPrice)}
                                                                    </p>
                                                                )}
                                                                {royalDiscount > 0 && royalDiscountAmount > 0 && (
                                                                    <span className="text-[10px] text-plum-600 dark:text-plum-300 flex items-center">
                                                                        <FaCrown className="mr-1 text-[10px]" />
                                                                        {royalDiscount}% off
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {discountPercentage > 0 && royalDiscount > 0 && (
                                                                <div className="text-[10px] text-plum-600 dark:text-plum-300 mt-1">
                                                                    Saved: {DisplayPriceInShillings(productDiscountAmount)}
                                                                    {royalDiscountAmount > 0 && (
                                                                        <span> + {DisplayPriceInShillings(royalDiscountAmount)}</span>
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

                                <div className='mt-auto w-full bg-white dark:bg-dm-card border-t-2 dark:border-dm-border p-3 transition-colors duration-200 safe-area-bottom'>
                                    <div className='flex justify-between px-1 mb-2 text-sm dark:text-white'>
                                        <p>{totalQty} items</p>
                                        <p className="font-price font-semibold">Total: {DisplayPriceInShillings(totalPrice)}</p>
                                    </div>

                                    {notDiscountTotalPrice > totalPrice && (
                                        <div className="flex justify-between px-1 mb-2 text-xs text-plum-600 dark:text-plum-300">
                                            <p>Your total savings:</p>
                                            <p className="font-medium">{DisplayPriceInShillings(notDiscountTotalPrice - totalPrice)}</p>
                                        </div>
                                    )}

                                    {royalDiscount > 0 && (
                                        <div className="flex justify-between px-1 mb-2 text-xs text-gold-600 dark:text-gold-400">
                                            <p className="flex items-center">
                                                <FaCrown className="mr-1" />
                                                {royalCardData?.tier} tier:
                                            </p>
                                            <p>{royalDiscount}% applied</p>
                                        </div>
                                    )}

                                    <div className="flex gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowClearConfirm(true)}
                                            className="py-2.5 px-3 border border-brown-200 dark:border-dm-border text-brown-600 dark:text-white/70 hover:bg-blush-50 dark:hover:bg-plum-900/30 rounded-pill flex items-center justify-center gap-1 text-sm transition-colors"
                                        >
                                            <FaTrash size={14} />
                                            <span>Clear All</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={redirectToCheckoutPage}
                                            className="flex-1 py-2.5 bg-gold-500 hover:bg-gold-400 text-charcoal font-semibold rounded-pill flex items-center justify-center gap-1 text-sm transition-colors press shadow-sm hover:shadow-gold"
                                        >
                                            <span>Checkout</span>
                                            <FaCaretRight/>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )
                        :
                        (
                            <div className="flex flex-col items-center justify-center py-12 px-4 flex-1">
                                <img
                                    src={imageEmpty}
                                    alt="Empty Cart"
                                    className="w-36 h-36 object-contain opacity-90"
                                />
                                <h1 className="font-semibold text-charcoal dark:text-white mt-4">Your cart is empty</h1>
                                <p className="text-sm text-brown-400 dark:text-white/50 mx-2 text-center mt-2 max-w-xs">
                                    Add something beautiful - browse categories from the shop.
                                </p>
                            </div>
                        )
                    }
                </div>
            </>
    )

    return (
        <>
            {isEmbedded ? (
                <div className={innerShellClass}>{innerBody}</div>
            ) : (
                <section className="fixed inset-0 z-50 bg-neutral-900/70">
                    <div className={innerShellClass}>{innerBody}</div>
                </section>
            )}

            {showFulfillmentModal && (
                <FulfillmentModal
                    isOpen={showFulfillmentModal}
                    onClose={() => setShowFulfillmentModal(false)}
                    onSelect={handleFulfillmentSelect}
                    pickupLocations={pickupLocations}
                />
            )}

            {showClearConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-plum-900/50 p-4">
                    <div className="w-full max-w-sm rounded-card border border-brown-100 bg-white p-6 shadow-hover dark:border-dm-border dark:bg-dm-card">
                        <h3 className="mb-2 text-lg font-semibold text-charcoal dark:text-white">Clear cart?</h3>
                        <p className="mb-5 text-sm text-brown-500 dark:text-white/55">Remove all items from your cart. This cannot be undone.</p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowClearConfirm(false)}
                                className="rounded-pill border border-brown-200 px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-plum-50 dark:border-dm-border dark:text-white/80 dark:hover:bg-plum-900/30"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleClearCart}
                                className="rounded-pill bg-plum-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-plum-600"
                            >
                                Clear all
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
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
        <div className="fixed inset-0 bg-plum-900/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dm-card p-6 rounded-card max-w-md w-full border border-brown-100 dark:border-dm-border shadow-hover transition-colors duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-charcoal dark:text-white">How would you like to receive your order?</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-brown-400 hover:text-charcoal dark:hover:text-white hover:bg-plum-50 dark:hover:bg-plum-900/30 transition-colors"
                        aria-label="Close"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                        type="button"
                        onClick={() => setSelectedMethod('delivery')}
                        className={`p-4 rounded-card border-2 flex flex-col items-center justify-center transition-colors ${
                            selectedMethod === 'delivery'
                                ? 'border-plum-600 bg-plum-50 dark:bg-plum-900/40 dark:border-plum-400'
                                : 'border-brown-100 dark:border-dm-border hover:bg-plum-50/50 dark:hover:bg-plum-900/20'
                        }`}
                    >
                        <FaTruck className={`text-2xl mb-2 ${selectedMethod === 'delivery' ? 'text-plum-700 dark:text-plum-300' : 'text-brown-400 dark:text-white/45'}`} />
                        <span className={`text-sm font-medium ${selectedMethod === 'delivery' ? 'text-plum-800 dark:text-plum-200' : 'text-charcoal dark:text-white/75'}`}>
                            Delivery
                        </span>
                        <p className="text-[11px] text-brown-400 dark:text-white/45 mt-1 text-center leading-snug">
                            We deliver to your address
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSelectedMethod('pickup')}
                        className={`p-4 rounded-card border-2 flex flex-col items-center justify-center transition-colors ${
                            selectedMethod === 'pickup'
                                ? 'border-gold-500 bg-gold-50 dark:bg-gold-600/15 dark:border-gold-400'
                                : 'border-brown-100 dark:border-dm-border hover:bg-gold-50/40 dark:hover:bg-gold-900/10'
                        }`}
                    >
                        <FaStore className={`text-2xl mb-2 ${selectedMethod === 'pickup' ? 'text-gold-600 dark:text-gold-300' : 'text-brown-400 dark:text-white/45'}`} />
                        <span className={`text-sm font-medium ${selectedMethod === 'pickup' ? 'text-charcoal dark:text-gold-200' : 'text-charcoal dark:text-white/75'}`}>
                            Pickup
                        </span>
                        <p className="text-[11px] text-brown-400 dark:text-white/45 mt-1 text-center leading-snug">
                            Collect from our store
                        </p>
                    </button>
                </div>

                {selectedMethod === 'pickup' && (
                    <div className="mb-6 space-y-3">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45">
                            Pickup location
                        </label>
                        <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="w-full p-3 rounded-lg border border-brown-200 dark:border-dm-border bg-ivory dark:bg-dm-surface text-charcoal dark:text-white text-sm"
                            required
                        >
                            <option value="">Select a location</option>
                            {pickupLocations.map((location, index) => (
                                <option key={index} value={location.address}>
                                    {location.name} - {location.address}
                                </option>
                            ))}
                        </select>

                        <label className="block text-xs font-semibold uppercase tracking-wide text-brown-500 dark:text-white/45 mt-2">
                            Instructions (optional)
                        </label>
                        <textarea
                            value={pickupInstructions}
                            onChange={(e) => setPickupInstructions(e.target.value)}
                            placeholder="Any special instructions..."
                            className="w-full p-3 rounded-lg border border-brown-200 dark:border-dm-border bg-ivory dark:bg-dm-surface text-charcoal dark:text-white text-sm placeholder:text-brown-300 dark:placeholder:text-white/30"
                            rows={3}
                        />
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleSelect}
                    disabled={!selectedMethod || (selectedMethod === 'pickup' && !selectedLocation)}
                    className={`w-full py-3 px-4 rounded-pill font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                        selectedMethod && !(selectedMethod === 'pickup' && !selectedLocation)
                            ? 'bg-gold-500 hover:bg-gold-400 text-charcoal press shadow-sm hover:shadow-gold'
                            : 'bg-brown-100 dark:bg-dm-border text-brown-400 dark:text-white/35 cursor-not-allowed'
                    }`}
                >
                    Continue to checkout <FaArrowRight className="text-sm" />
                </button>
            </div>
        </div>
    );
};

export default DisplayCartItem
