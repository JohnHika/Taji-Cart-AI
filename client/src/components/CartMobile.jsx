import React, { useEffect } from 'react';
import { FaCaretRight } from "react-icons/fa";
import { FaCartShopping } from 'react-icons/fa6';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useStoreCompact } from '../context/StoreLayoutContext';
import { useGlobalContext } from '../provider/GlobalProvider';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { fetchCartItems } from '../redux/slice/cartSlice';

const CartMobileLink = () => {
    const isCompact = useStoreCompact();
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

    if (!isCompact) {
        return null;
    }

    // Always show cart icon even if empty
    return (
        <div className="sticky bottom-4 p-2 z-20 pointer-events-none">
            <div className="pointer-events-auto bg-plum-800 dark:bg-plum-900 border border-plum-700 dark:border-plum-700 px-3 py-2 rounded-pill text-white text-sm flex items-center justify-between gap-3 shadow-hover max-w-md mx-auto">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="p-2 bg-gold-500 text-charcoal rounded-pill w-fit shrink-0">
                        <FaCartShopping className="text-base" />
                    </div>
                    <div className="text-xs leading-tight min-w-0">
                        <p className="font-semibold">{totalQty || 0} items</p>
                        <p className="text-gold-200 font-price truncate">{DisplayPriceInShillings(totalPrice || 0)}</p>
                    </div>
                </div>

                <Link
                    to="/mobile/cart"
                    className="flex items-center gap-1 text-gold-300 hover:text-gold-200 font-semibold text-sm shrink-0"
                >
                    <span>View cart</span>
                    <FaCaretRight />
                </Link>
            </div>
        </div>
    );
};

export default CartMobileLink;
