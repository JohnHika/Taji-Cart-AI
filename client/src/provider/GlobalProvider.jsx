import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import SummaryApi from "../common/SummaryApi";
import { handleAddAddress } from "../store/addressSlice";
import { handleAddItemCart } from "../store/cartProduct";
import { setOrder } from "../store/orderSlice";
import Axios from "../utils/Axios";
import AxiosToastError from "../utils/AxiosToastError";
import { getRoyalCardDiscount, pricewithDiscount } from "../utils/PriceWithDiscount";

const globalContext = createContext();

const GlobalProvider = ({ children }) => {
    const dispatch = useDispatch()
    const [totalPrice, setTotalPrice] = useState(0);
    const [totalQty, setTotalQty] = useState(0);
    const [notDiscountTotalPrice, setNotDiscountTotalPrice] = useState(0);
    const [royalCardData, setRoyalCardData] = useState(null);
    const [royalDiscount, setRoyalDiscount] = useState(0);
    const cart = useSelector(state => state.cartItem?.cart || []);
    const user = useSelector(state => state?.user)

    // Fetch user's Royal card data
    const fetchRoyalCardData = async() => {
        try {
            if (!user?._id) return;

            const response = await Axios({
                url: `/api/users/${user._id}/loyalty-card`,
                method: 'GET'
            });

            if (response.data?.success) {
                const cardData = response.data.data;
                setRoyalCardData(cardData);
                
                // Calculate royal discount based on tier
                const discount = getRoyalCardDiscount(cardData.tier);
                setRoyalDiscount(discount);
                console.log(`Applied Royal card discount: ${discount}% (${cardData.tier} tier)`);
            }
        } catch (error) {
            console.error("Error fetching Royal card data:", error);
        }
    };

    const fetchCartItem = async() => {
        try {
            if (!user?._id) {
                console.log("No authenticated user, skipping cart fetch");
                return;
            }
            
            console.log("Fetching cart items...");
            
            // Make the request with cookie-based auth (withCredentials is enabled in Axios.js)
            const response = await Axios({
                url: SummaryApi.getCartItem.url,
                method: SummaryApi.getCartItem.method
            });
            
            // Log raw response
            console.log("Raw cart response:", response.data);
            
            if (response.data.success) {
                console.log("Cart fetch successful:", response.data);
                dispatch(handleAddItemCart(response.data.data || []));
            } else {
                console.log("Cart fetch failed:", response.data.message);
            }
        } catch (error) {
            console.error("Cart fetch error details:", error);
            if (error.response) {
                console.log("Error status:", error.response.status);
                console.log("Error data:", error.response.data);
            }
        }
    }

    const updateCartItem = async(id,qty)=>{
      try {
          const response = await Axios({
            url: SummaryApi.updateCartItemQty.url,
            method: SummaryApi.updateCartItemQty.method,
            data : {
              _id : id,
              qty : qty
            }
          })
          const { data : responseData } = response

          if(responseData.success){
              // toast.success(responseData.message)
              fetchCartItem()
              return responseData
          }
      } catch (error) {
        AxiosToastError(error)
        return error
      }
    }
    
    const deleteCartItem = async(cartId)=>{
      try {
          const response = await Axios({
            url: SummaryApi.deleteCartItem.url,
            method: SummaryApi.deleteCartItem.method,
            data : {
              _id : cartId
            }
          })
          const { data : responseData} = response

          if(responseData.success){
            toast.success(responseData.message)
            fetchCartItem()
          }
      } catch (error) {
         AxiosToastError(error)
      }
    }

    const clearCartItems = async() => {
      try {
          const response = await Axios({
            url: SummaryApi.clearCart.url,
            method: SummaryApi.clearCart.method
          });
          
          if(response.data.success) {
            dispatch(handleAddItemCart([]));
            console.log("Cart cleared successfully");
          }
      } catch (error) {
         AxiosToastError(error);
         console.error("Failed to clear cart:", error);
      }
    }

    useEffect(()=>{
      const qty = cart.reduce((preve,curr)=>{
          return preve + curr.quantity
      },0)
      setTotalQty(qty)
      
      const tPrice = cart.reduce((preve,curr)=>{
          // Apply both product discount and Royal card discount
          const priceAfterDiscount = pricewithDiscount(
              curr?.productId?.price,
              curr?.productId?.discount,
              royalDiscount // Apply Royal card discount
          )

          return preve + (priceAfterDiscount * curr.quantity)
      },0)
      setTotalPrice(tPrice)

      const notDiscountPrice = cart.reduce((preve,curr)=>{
        return preve + (curr?.productId?.price * curr.quantity)
      },0)
      setNotDiscountTotalPrice(notDiscountPrice)
  },[cart, royalDiscount]) // Added royalDiscount as dependency

    const handleLogoutOut = async () => {
        try {
            // Call logout API to clear server-side session cookies
            await Axios({
                url: SummaryApi.logout.url,
                method: SummaryApi.logout.method
            });
            
            // Clear local state
            dispatch(handleAddItemCart([]))
            setRoyalCardData(null)
            setRoyalDiscount(0)
            
            // Clear localStorage as fallback
            localStorage.clear()
        } catch (error) {
            console.error("Logout error:", error);
            // Still clear local state even if API call fails
            dispatch(handleAddItemCart([]))
            setRoyalCardData(null)
            setRoyalDiscount(0)
            localStorage.clear()
        }
    }

    const fetchAddress = async()=>{
      try {
        const response = await Axios({
          url: SummaryApi.getAddress.url,
          method: SummaryApi.getAddress.method
        })
        const { data : responseData } = response

        if(responseData.success){
          dispatch(handleAddAddress(responseData.data))
        }
      } catch (error) {
          // AxiosToastError(error)
      }
    }
    
    const fetchOrder = async()=>{
      try {
        const response = await Axios({
          url: SummaryApi.getOrderItems.url,
          method: SummaryApi.getOrderItems.method
        })
        const { data : responseData } = response

        if(responseData.success){
            dispatch(setOrder(responseData.data))
        }
      } catch (error) {
        console.log(error)
      }
    }

    useEffect(()=>{
      if (user?._id) {
        // Only fetch data if user is logged in
        fetchCartItem()
        fetchAddress()
        fetchOrder()
        fetchRoyalCardData() // Fetch Royal card data when user is logged in
      } else {
        // Clear data when user is not logged in
        dispatch(handleAddItemCart([]))
        setRoyalCardData(null)
        setRoyalDiscount(0)
      }
    },[user, user?._id])
    
    return(
        <globalContext.Provider value={{
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
            royalDiscount
        }}>
            {children}
        </globalContext.Provider>
    )
}

export const useGlobalContext = () => useContext(globalContext);
export default GlobalProvider;