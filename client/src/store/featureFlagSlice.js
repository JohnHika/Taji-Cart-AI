import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';

// Don't re-fetch more often than this window (gated components can mount
// frequently). Pass { force: true } to bypass, e.g. right after an admin
// releases/pulls a feature so all open gates update immediately.
const REFRESH_WINDOW_MS = 5 * 60 * 1000;

// The SERVER decides what this requester may see: released flags for guests
// and regular users, plus admin-only previews when signed in as admin.
// The slice therefore never second-guesses the list it receives.
export const fetchFeatureFlags = createAsyncThunk(
  'featureFlags/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await Axios({ ...SummaryApi.getVisibleFeatureFlags });
      return response.data?.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load feature flags');
    }
  },
  {
    condition: (arg, { getState }) => {
      const { featureFlags } = getState();
      if (featureFlags?.loading) return false;
      if (!arg?.force && featureFlags?.loadedAt && Date.now() - featureFlags.loadedAt < REFRESH_WINDOW_MS) {
        return false;
      }
      return true;
    },
  }
);

const featureFlagSlice = createSlice({
  name: 'featureFlags',
  initialState: {
    flags: [],
    loading: false,
    loadedAt: null,
    error: null,
  },
  reducers: {
    clearFeatureFlags: (state) => {
      state.flags = [];
      state.loading = false;
      state.loadedAt = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeatureFlags.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeatureFlags.fulfilled, (state, action) => {
        state.loading = false;
        state.flags = action.payload;
        state.loadedAt = Date.now();
      })
      .addCase(fetchFeatureFlags.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Identity changed (login, logout, app-init user refresh) → drop the
      // cached list. The next gated component refetches with the new token so
      // admin previews appear on login and vanish on logout.
      .addCase('user/setUserDetails', (state) => {
        state.flags = [];
        state.loadedAt = null;
      })
      .addCase('user/logout', (state) => {
        state.flags = [];
        state.loadedAt = null;
      });
  },
});

export const { clearFeatureFlags } = featureFlagSlice.actions;
export default featureFlagSlice.reducer;
