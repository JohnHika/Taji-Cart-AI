import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';

export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchItems',
  async (_, { getState, rejectWithValue }) => {
    try {
      const isLoggedIn = Boolean(getState()?.user?._id);
      if (!isLoggedIn) return [];

      const response = await Axios({ ...SummaryApi.getWishlist });
      return response.data?.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch wishlist');
    }
  }
);

export const toggleWishlistItem = createAsyncThunk(
  'wishlist/toggleItem',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await Axios({
        ...SummaryApi.toggleWishlist,
        data: { productId },
      });
      return { productId, added: response.data?.added };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update wishlist');
    }
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearWishlist: (state) => {
      state.items = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(toggleWishlistItem.fulfilled, (state, action) => {
        const { productId, added } = action.payload;
        if (added) {
          if (!state.items.some((item) => item._id === productId)) {
            state.items.push({ _id: productId });
          }
        } else {
          state.items = state.items.filter((item) => item._id !== productId);
        }
      });
  },
});

export const { clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
