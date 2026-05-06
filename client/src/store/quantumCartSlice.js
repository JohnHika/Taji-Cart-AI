/**
 * QUANTUM CART REDUX SLICE
 *
 * State management for quantum superposition cart
 * Einstein would roll over in his grave
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { QuantumCartItem, quantumCartManager } from '../quantum/QuantumCartState';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';

// Async thunks

/**
 * Add item to quantum superposition
 */
export const addToQuantumCart = createAsyncThunk(
  'quantumCart/addItem',
  async ({ product, possibilities }, { rejectWithValue }) => {
    try {
      const quantumItem = new QuantumCartItem(product, possibilities);
      return { quantumItem };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Entangle guest cart with user session
 */
export const entangleCarts = createAsyncThunk(
  'quantumCart/entangle',
  async ({ guestSessionId, userSessionId }, { rejectWithValue }) => {
    try {
      const result = quantumCartManager.entangleSessions(guestSessionId, userSessionId);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Collapse quantum cart to classical state (checkout)
 */
export const collapseQuantumCart = createAsyncThunk(
  'quantumCart/collapse',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { quantumCart } = getState();
      const result = quantumCartManager.observeCart(quantumCart.items);

      // Sync collapsed state to backend
      const collapsedItems = result.observation.collapsedStates.map(cs => ({
        productId: cs.itemId,
        quantity: cs.collapsedState.quantity,
        price: cs.collapsedState.price
      }));

      // Create order with collapsed quantum state
      const response = await Axios({
        ...SummaryApi.createQuantumOrder,
        data: {
          items: collapsedItems,
          observationId: result.observation.id,
          expectedValue: result.observation.totalExpectedValue,
          observedValue: result.observation.totalObservedValue,
          quantumSavings: result.savings
        }
      });

      return {
        ...result,
        serverResponse: response.data
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Attempt quantum tunneling from wishlist
 */
export const attemptTunneling = createAsyncThunk(
  'quantumCart/tunnel',
  async ({ wishlistItem }, { rejectWithValue }) => {
    try {
      const quantumItem = new QuantumCartItem(wishlistItem);
      const tunnelResult = quantumItem.attemptTunnel();

      if (tunnelResult.success) {
        return {
          quantumItem,
          tunnelResult
        };
      }

      return rejectWithValue(tunnelResult.message);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Transfer quantum state from guest to user
 */
export const transferQuantumState = createAsyncThunk(
  'quantumCart/transferState',
  async ({ guestItems, userId }, { rejectWithValue }) => {
    try {
      const result = quantumCartManager.transferQuantumState(guestItems, userId);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const quantumCartSlice = createSlice({
  name: 'quantumCart',
  initialState: {
    items: [],
    isEntangled: false,
    entanglementId: null,
    coherenceLevel: 1.0,
    observationHistory: [],
    lastObservation: null,
    stats: null,
    loading: false,
    error: null,
    tunnelingAttempts: 0,
    successfulTunnels: 0
  },
  reducers: {
    clearQuantumCart: (state) => {
      state.items = [];
      state.isEntangled = false;
      state.entanglementId = null;
      state.coherenceLevel = 1.0;
    },

    refreshCoherence: (state) => {
      // Reset coherence timer for all items
      state.items.forEach(item => {
        if (!item.isCollapsed) {
          item.coherenceStart = Date.now();
        }
      });
    },

    updateQuantumStats: (state) => {
      state.stats = quantumCartManager.getQuantumStats(state.items);
    },

    applyUncertainty: (state, action) => {
      const { itemId, focusOn } = action.payload;
      const item = state.items.find(i => i.id === itemId);
      if (item) {
        item.applyUncertainty(focusOn);
      }
    },

    entangleItems: (state, action) => {
      const { itemId1, itemId2 } = action.payload;
      const item1 = state.items.find(i => i.id === itemId1);
      const item2 = state.items.find(i => i.id === itemId2);

      if (item1 && item2) {
        item1.entangledWith.push(item2.waveFunctionId);
        item2.entangledWith.push(item1.waveFunctionId);
      }
    },

    setCoherenceLevel: (state, action) => {
      state.coherenceLevel = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Add to quantum cart
      .addCase(addToQuantumCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(addToQuantumCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload.quantumItem);
        state.stats = quantumCartManager.getQuantumStats(state.items);
      })
      .addCase(addToQuantumCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Entangle carts
      .addCase(entangleCarts.fulfilled, (state, action) => {
        state.isEntangled = true;
        state.entanglementId = action.payload.entanglementId;
      })

      // Collapse cart
      .addCase(collapseQuantumCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(collapseQuantumCart.fulfilled, (state, action) => {
        state.loading = false;
        state.lastObservation = action.payload.observation;
        state.observationHistory.push(action.payload.observation);

        // Mark all items as collapsed
        state.items.forEach(item => {
          if (!item.isCollapsed) {
            item.collapse();
          }
        });

        state.stats = quantumCartManager.getQuantumStats(state.items);
      })
      .addCase(collapseQuantumCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Tunneling
      .addCase(attemptTunneling.fulfilled, (state, action) => {
        state.items.push(action.payload.quantumItem);
        state.successfulTunnels += 1;
        state.tunnelingAttempts += 1;
        state.stats = quantumCartManager.getQuantumStats(state.items);
      })
      .addCase(attemptTunneling.rejected, (state) => {
        state.tunnelingAttempts += 1;
      })

      // Transfer quantum state
      .addCase(transferQuantumState.fulfilled, (state, action) => {
        state.items = [...state.items, ...action.payload.items];
        state.stats = quantumCartManager.getQuantumStats(state.items);
      });
  }
});

export const {
  clearQuantumCart,
  refreshCoherence,
  updateQuantumStats,
  applyUncertainty,
  entangleItems,
  setCoherenceLevel
} = quantumCartSlice.actions;

export default quantumCartSlice.reducer;
