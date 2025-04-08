import { configureStore } from "@reduxjs/toolkit";
import thunk from 'redux-thunk';
import addressReducer from './slice/addressSlice';
import cartReducer from './slice/cartSlice';
import categoryReducer from './slice/categorySlice';
import orderReducer from './slice/orderSlice';
import productReducer from './slice/productSlice';
import userReducer from './slice/userSlice';

const appReducer = {
  user: userReducer,
  product: productReducer,
  cartItem: cartReducer,
  orders: orderReducer,
  addresses: addressReducer,
  categories: categoryReducer,
};

// Create root reducer with app state reset capability
const rootReducer = (state, action) => {
  // Clear all data in redux store on logout
  if (action.type === 'user/logout') {
    state = undefined;
  }
  
  return appReducer(state, action);
};

const store = configureStore({
  reducer: appReducer,
  middleware: [thunk]
});

export default store;
