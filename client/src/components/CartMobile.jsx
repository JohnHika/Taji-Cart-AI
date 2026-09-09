import React, { useEffect } from 'react';
import { FaCaretRight } from "react-icons/fa";
import { FaCartShopping } from 'react-icons/fa6';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { useGlobalContext } from '../provider/GlobalProvider';
import { DisplayPriceInShillings } from '../utils/DisplayPriceInShillings';
import { fetchCartItems } from '../store/cartProduct';
import { shouldRenderMobileCartSummary } from '../utils/mobileShell';

const CartMobileLink = () => {
    const { totalPrice, totalQty } = useGlobalContext();
    const user = useSelector(state => state.user);
    const cart = useSelector(state => state.cartItem?.cart || []);
    const dispatch = useDispatch();
    const location = useLocation();
    
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
    
    if (!shouldRenderMobileCartSummary({
        isAuthenticated: Boolean(user?._id),
        totalQty,
        pathname: location.pathname
    })) {
        return null;
    }

    // Show the compact summary only when it adds useful purchase context.
    return (
        <div
            className="pointer-events-none fixed inset-x-3 z-30 lg:hidden"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4.75rem)' }}
        >
            <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-3 rounded-pill border border-plum-700 bg-plum-800 px-3 py-2 text-sm text-white shadow-card dark:bg-plum-900">
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
                    className="press flex shrink-0 items-center gap-1 text-sm font-semibold text-gold-300 transition-colors hover:text-gold-200"
                >
                    <span>View cart</span>
                    <FaCaretRight />
                </Link>
            </div>
        </div>
    );
};

export default CartMobileLink;
