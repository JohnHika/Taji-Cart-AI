import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { baseURL } from '../common/SummaryApi';
import Axios from '../utils/Axios';
import { getGuestCart } from '../utils/guestCart';

// Fetch cart items thunk
export const fetchCartItems = createAsyncThunk(
  'cart/fetchItems',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('accesstoken');

      // If user is logged in, fetch from server
      if (token) {
        const response = await Axios({
          url: `${baseURL}/api/cart/get`,
          method: 'GET'
        });
        return response.data.data || [];
      }

      // If guest, fetch from cookie
      return getGuestCart();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch cart items';
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// Clear cart items thunk
export const clearCartItems = createAsyncThunk(
  'cart/clearItems',
  async (_, { rejectWithValue }) => {
    try {
      console.log("Explicitly clearing cart items");
      const token = localStorage.getItem('accesstoken');

      if (token) {
        try {
          await Axios({
            url: `${baseURL}/api/cart/clear`,
            method: 'DELETE'
          });
          console.log("Successfully cleared cart items on server");
        } catch (error) {
          console.error("Failed to clear cart on server:", error);
        }
      }

      return [];
    } catch (error) {
      return rejectWithValue('Failed to clear cart items');
    }
  }
);

const cartSlice = createSlice({
  name: 'cartItem',
  initialState: {
    cart: [],
    loading: false,
    error: null
  },
  reducers: {
    handleAddItemCart: (state, action) => {
      state.cart = [...action.payload];
    },
    clearCart: (state) => {
      state.cart = [];
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCartItems.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCartItems.fulfilled, (state, action) => {
        state.loading = false;
        state.cart = action.payload;
      })
      .addCase(fetchCartItems.rejected, (state) => {
        state.loading = false;
        state.cart = [];
      })
      .addCase(clearCartItems.fulfilled, (state) => {
        state.cart = [];
        state.loading = false;
      });
  }
});

export const { handleAddItemCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
