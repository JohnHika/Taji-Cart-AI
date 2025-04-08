import { configureStore } from '@reduxjs/toolkit'
import userReducer from './userSlice'
import productReducer from './productSlice'
import cartReducer from './cartProduct'
import addressReducer from './addressSlice'
import orderReducer from './orderSlice'
// import themeReducer from './themeSlice' // Comment this line

export const store = configureStore({
  reducer: {
    user: userReducer,
    product: productReducer,
    cartItem: cartReducer,
    addresses: addressReducer,  // Make sure this name matches what you use in useSelector
    orders: orderReducer,
    // theme: themeReducer // Comment this line
  },
})