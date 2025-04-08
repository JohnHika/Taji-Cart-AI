import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { baseURL } from '../../common/SummaryApi';
import Axios from '../../utils/Axios';

// Fetch cart items thunk
export const fetchCartItems = createAsyncThunk(
  'cart/fetchItems',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('accesstoken');
      if (!token) return [];
      
      const response = await Axios({
        url: `${baseURL}/api/cart/get`,
        method: 'GET'
      });
      
      return response.data.data || [];
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch cart items';
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

// Add a clearCartItems thunk to explicitly clear the cart
export const clearCartItems = createAsyncThunk(
  'cart/clearItems',
  async (_, { rejectWithValue }) => {
    try {
      console.log("Explicitly clearing cart items");
      const token = localStorage.getItem('accesstoken');
      
      if (token) {
        try {
          // Use the Axios utility instead of axios directly
          await Axios({
            url: `${baseURL}/api/cart/clear`,
            method: 'DELETE'
          });
          console.log("Successfully cleared cart items on server");
        } catch (error) {
          console.error("Failed to clear cart on server:", error);
          // Continue even if the API call fails
        }
      }
      
      // Return empty array to clear local state
      return [];
    } catch (error) {
      return rejectWithValue('Failed to clear cart items');
    }
  }
);

// Add a new thunk to fetch receipt details
export const fetchReceiptDetails = createAsyncThunk(
  'cart/fetchReceipt',
  async (orderId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('accesstoken');
      if (!token) return null;
      
      const response = await Axios({
        url: `${baseURL}/api/orders/${orderId}/receipt`,
        method: 'GET'
      });
      
      return response.data.data || null;
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to fetch receipt details';
      toast.error(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

const cartSlice = createSlice({
  name: 'cartItem',
  initialState: { 
    cart: [], 
    loading: false, 
    error: null,
    receipt: null,
    receiptLoading: false
  },
  reducers: {
    // Add a clearCart reducer to clear cart on logout
    clearCart: (state) => {
      state.cart = [];
      state.loading = false;
      state.error = null;
    },
    // Add a clearReceipt reducer
    clearReceipt: (state) => {
      state.receipt = null;
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
        state.cart = []; // Reset cart on error
      })
      .addCase(clearCartItems.fulfilled, (state) => {
        state.cart = [];
        state.loading = false;
      })
      // Add receipt-related cases
      .addCase(fetchReceiptDetails.pending, (state) => {
        state.receiptLoading = true;
      })
      .addCase(fetchReceiptDetails.fulfilled, (state, action) => {
        state.receiptLoading = false;
        state.receipt = action.payload;
      })
      .addCase(fetchReceiptDetails.rejected, (state) => {
        state.receiptLoading = false;
        state.receipt = null;
        state.error = 'Failed to fetch receipt details';
      });
  }
});

export const { clearCart, clearReceipt } = cartSlice.actions;
export default cartSlice.reducer;