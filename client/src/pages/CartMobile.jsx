import React, { useState } from 'react'
import DisplayCartItem from '../components/DisplayCartItem'
import { useSelector } from 'react-redux'

const CartMobile = () => {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const cartItems = useSelector(state => state.cartItem.cart)
  const itemCount = cartItems?.length || 0

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen)
  }

  return (
    <>
      {/* Cart toggle button */}
      <button
        onClick={toggleCart}
        className="fixed bottom-5 right-5 relative bg-gold-500 hover:bg-gold-400 text-charcoal rounded-full p-3 shadow-hover flex items-center justify-center z-10 transition-colors press lg:hidden"
        aria-label="Open cart"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-plum-700 text-white rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center text-[10px] font-bold">
            {itemCount > 9 ? '9+' : itemCount}
          </span>
        )}
      </button>
      
      {/* Cart contents (only shown when isCartOpen is true) */}
      {isCartOpen && <DisplayCartItem close={() => setIsCartOpen(false)} />}
    </>
  )
}

export default CartMobile
