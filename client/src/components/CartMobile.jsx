import React, { useEffect } from 'react';
import { FaCaretRight } from "react-icons/fa";
import { FaCartShopping } from 'react-icons/fa6';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useGlobalContext } from '../provider/GlobalProvider';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { fetchCartItems } from '../redux/slice/cartSlice';

const CartMobileLink = () => {
    const { totalPrice, totalQty } = useGlobalContext();
    const user = useSelector(state => state.user);
    const cart = useSelector(state => state.cartItem?.cart || []);
    const dispatch = useDispatch();
    
    // Fetch cart when component mounts if user is logged in
    useEffect(() => {
        if (user?._id) {
            console.log("Fetching cart for logged in user");
            dispatch(fetchCartItems());
        }
    }, [user?._id, dispatch]);
    
    // Debug cart count
    useEffect(() => {
        console.log("Cart count:", cart.length, "Total qty:", totalQty);
    }, [cart, totalQty]);
    
    // Don't attempt to fetch anything unless user is logged in
    if (!user?._id) {
        return null; // Don't render cart for unauthenticated users
    }

    // Always show cart icon even if empty
    return (
        <div className='sticky bottom-4 p-2'>
            <div className='bg-green-600 px-2 py-1 rounded text-neutral-100 text-sm flex items-center justify-between gap-3 lg:hidden'>
                <div className='flex items-center gap-2'>
                    <div className='p-2 bg-green-500 rounded w-fit'>
                        <FaCartShopping />
                    </div>
                    <div className='text-xs'>
                        <p>{totalQty || 0} items</p>
                        <p>{DisplayPriceInShillings(totalPrice || 0)}</p>
                    </div>
                </div>

                <Link to={"/cart"} className='flex items-center gap-1'>
                    <span className='text-sm'>View Cart</span>
                    <FaCaretRight />
                </Link>
            </div>
        </div>
    );
};

export default CartMobileLink;
