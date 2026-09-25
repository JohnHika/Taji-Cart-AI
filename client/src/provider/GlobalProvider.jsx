import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import SummaryApi from "../common/SummaryApi";
import { handleAddAddress } from "../store/addressSlice";
import { fetchCartItems, handleAddItemCart } from "../store/cartProduct";
import { setOrder } from "../store/orderSlice";
import Axios from "../utils/Axios";
import AxiosToastError from "../utils/AxiosToastError";
import { clearAuthStorage } from "../utils/authStorage";
import { clearGuestCart } from "../utils/guestCart";
import { getRoyalCardDiscount, pricewithDiscount } from "../utils/PriceWithDiscount";
import { getEffectiveUnitPrice, isWholesaleEligible } from "../utils/wholesalePricing";

// Default context value to prevent undefined destructuring during concurrent rendering
const defaultContextValue = {
    fetchCartItem: () => {},
    updateCartItem: () => {},
    deleteCartItem: () => {},
    clearCartItems: () => {},
    fetchAddress: () => {},
    totalPrice: 0,
    totalQty: 0,
    notDiscountTotalPrice: 0,
    fetchOrder: () => {},
    royalCardData: null,
    royalDiscount: 0,
    wholesaleEligible: false,
    wholesaleStackDiscounts: false
};

const globalContext = createContext(defaultContextValue);

const GlobalProvider = ({ children }) => {
    const dispatch = useDispatch();
    const [totalPrice, setTotalPrice] = useState(0);
    const [totalQty, setTotalQty] = useState(0);
    const [notDiscountTotalPrice, setNotDiscountTotalPrice] = useState(0);
    const [royalCardData, setRoyalCardData] = useState(null);
    const [royalDiscount, setRoyalDiscount] = useState(0);
    const [wholesaleStackDiscounts, setWholesaleStackDiscounts] = useState(false);
    const cart = useSelector(state => state.cartItem?.cart || []);
    // Only re-run user-keyed effects when the id itself changes — userSlice
    // replaces the whole user object (token refresh, tab refocus, profile
    // save) far more often than the identity of the logged-in user changes,
    // and that used to re-fetch cart/address/loyalty-card every time.
    const userId = useSelector(state => state?.user?._id);

    // Fetch user's Royal card data
    const fetchRoyalCardData = useCallback(async () => {
        try {
            if (!userId) return;

            const response = await Axios({
                url: `/api/users/${userId}/loyalty-card`,
                method: 'GET'
            });

            if (response.data?.success && response.data?.hasAccess !== false) {
                const cardData = response.data.data;
                setRoyalCardData(cardData);

                // Calculate royal discount based on tier
                const discount = getRoyalCardDiscount(cardData.tier);
                setRoyalDiscount(discount);
            } else {
                setRoyalCardData(null);
                setRoyalDiscount(0);
            }
        } catch (error) {
            console.error("Error fetching Royal card data:", error);
        }
    }, [userId]);

    const fetchCartItem = useCallback(async () => {
        try {
            if (!userId) {
                return;
            }

            // Make the request with cookie-based auth (withCredentials is enabled in Axios.js)
            const response = await Axios({
                url: SummaryApi.getCartItem.url,
                method: SummaryApi.getCartItem.method
            });

            if (response.data.success) {
                dispatch(handleAddItemCart(response.data.data || []));
            }
        } catch (error) {
            console.error("Cart fetch error details:", error);
        }
    }, [userId, dispatch]);

    const updateCartItem = useCallback(async (id, qty) => {
        try {
            const response = await Axios({
                url: SummaryApi.updateCartItemQty.url,
                method: SummaryApi.updateCartItemQty.method,
                data: {
                    _id: id,
                    qty: qty
                },
                requestLockKey: `cart:update:${id}:${qty}`
            });
            const { data: responseData } = response;

            if (responseData.success) {
                fetchCartItem();
                return responseData;
            }
        } catch (error) {
            AxiosToastError(error);
            return error;
        }
    }, [fetchCartItem]);

    const deleteCartItem = useCallback(async (cartId) => {
        try {
            const response = await Axios({
                url: SummaryApi.deleteCartItem.url,
                method: SummaryApi.deleteCartItem.method,
                data: {
                    _id: cartId
                },
                requestLockKey: `cart:delete:${cartId}`
            });
            const { data: responseData } = response;

            if (responseData.success) {
                toast.success(responseData.message);
                fetchCartItem();
            }
        } catch (error) {
            AxiosToastError(error);
        }
    }, [fetchCartItem]);

    // Guests never had a server-side cart to clear — routing them through the
    // authenticated DELETE /api/cart/clear used to 401 and log them out.
    const clearCartItems = useCallback(async () => {
        if (!userId) {
            clearGuestCart();
            dispatch(handleAddItemCart([]));
            return;
        }

        try {
            const response = await Axios({
                url: SummaryApi.clearCart.url,
                method: SummaryApi.clearCart.method,
                requestLockKey: `cart:clear:${userId}`
            });

            if (response.data.success) {
                dispatch(handleAddItemCart([]));
            }
        } catch (error) {
            AxiosToastError(error);
            console.error("Failed to clear cart:", error);
        }
    }, [userId, dispatch]);

    // Wholesale pricing's stacking rule is an admin-configurable, storewide
    // toggle (see Product admin page) — fetch it once; it rarely changes.
    useEffect(() => {
        const fetchWholesaleSettings = async () => {
            try {
                const response = await Axios(SummaryApi.getWholesalePricingSettings);
                if (response.data?.success) {
                    setWholesaleStackDiscounts(Boolean(response.data.data?.stackDiscounts));
                }
            } catch (error) {
                // Non-fatal — falls back to the default (no stacking) if this fails.
                console.error("Error fetching wholesale pricing settings:", error);
            }
        };
        fetchWholesaleSettings();
    }, []);

    useEffect(() => {
        const qty = cart.reduce((preve, curr) => {
            return preve + curr.quantity;
        }, 0);
        setTotalQty(qty);

        // Cart-wide: once total quantity across every line exceeds the
        // threshold, every line with a wholesalePrice set becomes eligible.
        const wholesaleEligible = isWholesaleEligible(qty);

        const tPrice = cart.reduce((preve, curr) => {
            const priceAfterDiscount = getEffectiveUnitPrice({
                price: curr?.productId?.price,
                discount: curr?.productId?.discount,
                wholesalePrice: curr?.productId?.wholesalePrice,
                royalDiscount,
                wholesaleEligible,
                stackDiscounts: wholesaleStackDiscounts,
                pricewithDiscountFn: pricewithDiscount,
            });

            return preve + (priceAfterDiscount * curr.quantity);
        }, 0);
        setTotalPrice(tPrice);

        const notDiscountPrice = cart.reduce((preve, curr) => {
            const price = Number(curr?.productId?.price) || 0;
            return preve + (price * curr.quantity);
        }, 0);
        setNotDiscountTotalPrice(notDiscountPrice);
    }, [cart, royalDiscount, wholesaleStackDiscounts]);

    // Not currently wired to a "logout" button anywhere in the UI — logout
    // goes through AuthContext/authStorage directly — but left in place since
    // it's not part of the findings this pass covers.
    const handleLogoutOut = async () => {
        try {
            // Call logout API to clear server-side session cookies
            await Axios({
                url: SummaryApi.logout.url,
                method: SummaryApi.logout.method
            });

            // Clear local state
            dispatch(handleAddItemCart([]));
            setRoyalCardData(null);
            setRoyalDiscount(0);
            clearAuthStorage();
        } catch (error) {
            console.error("Logout error:", error);
            // Still clear local state even if API call fails
            dispatch(handleAddItemCart([]));
            setRoyalCardData(null);
            setRoyalDiscount(0);
            clearAuthStorage();
        }
    };
    // Referenced so lint doesn't flag it as unused while it's kept in reserve.
    void handleLogoutOut;

    const fetchAddress = useCallback(async () => {
        try {
            const response = await Axios({
                url: SummaryApi.getAddress.url,
                method: SummaryApi.getAddress.method
            });
            const { data: responseData } = response;

            if (responseData.success) {
                dispatch(handleAddAddress(responseData.data));
            }
        } catch {
            // AxiosToastError(error)
        }
    }, [dispatch]);

    const fetchOrder = useCallback(async () => {
        try {
            const response = await Axios({
                url: SummaryApi.getOrderItems.url,
                method: SummaryApi.getOrderItems.method
            });
            const { data: responseData } = response;

            if (responseData.success) {
                dispatch(setOrder(responseData.data));
            }
        } catch (error) {
            console.log(error);
        }
    }, [dispatch]);

    useEffect(() => {
        if (userId) {
            // Only fetch data if user is logged in. fetchOrder is deliberately
            // not called here — MyOrders.jsx fetches the order list itself on
            // mount, keyed on the same user?._id — this stays exposed on the
            // context for callers like CheckoutPage/PaymentSuccess to call
            // after placing an order.
            fetchCartItem();
            fetchAddress();
            fetchRoyalCardData();
        } else {
            // Guest: load whatever is in the local guest cart instead of
            // wiping it — there is no server cart to clear for a guest.
            dispatch(fetchCartItems());
            setRoyalCardData(null);
            setRoyalDiscount(0);
        }
    }, [userId, dispatch, fetchCartItem, fetchAddress, fetchRoyalCardData]);

    const contextValue = useMemo(() => ({
        fetchCartItem,
        updateCartItem,
        deleteCartItem,
        clearCartItems,
        fetchAddress,
        totalPrice,
        totalQty,
        notDiscountTotalPrice,
        fetchOrder,
        royalCardData,
        royalDiscount,
        wholesaleEligible: isWholesaleEligible(totalQty),
        wholesaleStackDiscounts
    }), [
        fetchCartItem,
        updateCartItem,
        deleteCartItem,
        clearCartItems,
        fetchAddress,
        totalPrice,
        totalQty,
        notDiscountTotalPrice,
        fetchOrder,
        royalCardData,
        royalDiscount,
        wholesaleStackDiscounts
    ]);

    return (
        <globalContext.Provider value={contextValue}>
            {children}
        </globalContext.Provider>
    );
};

GlobalProvider.propTypes = {
    children: PropTypes.node
};

export const useGlobalContext = () => useContext(globalContext);
export default GlobalProvider;
