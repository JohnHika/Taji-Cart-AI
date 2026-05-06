/**
 * QUANTUM SUPERPOSITION CART SYSTEM
 *
 * Einstein's nightmare: Applying quantum mechanics to shopping carts
 *
 * Core principles:
 * - Superposition: Items exist in multiple states until observed (checkout)
 * - Entanglement: Guest and user sessions are quantum-entangled
 * - Uncertainty: Cannot know exact price AND exact availability simultaneously
 * - Tunneling: Items can appear in cart from wishlist when probability threshold met
 * - Decoherence: Cart collapses to classical state on purchase
 */

import { v4 as uuidv4 } from 'uuid';
import { useState } from 'react';

/**
 * Quantum State Vector - represents an item in superposition
 * Multiple realities coexist until measurement (checkout)
 */
export class QuantumCartItem {
  constructor(product, possibilities = []) {
    this.id = uuidv4();
    this.waveFunctionId = uuidv4();
    this.product = product;

    // SUPERPOSITION: Multiple states exist simultaneously
    this.possibilities = possibilities.length > 0 ? possibilities : [
      { quantity: 1, price: product.price, probability: 0.4 },
      { quantity: 2, price: product.price * 1.9, probability: 0.3 }, // Bundle discount
      { quantity: 1, price: product.price * 1.1, probability: 0.2 }, // Premium variant
      { quantity: 0, price: 0, probability: 0.1 }, // Out of stock reality
    ];

    // Entanglement: Linked to other quantum states
    this.entangledWith = [];

    // Coherence: How long this superposition maintains
    this.coherenceStart = Date.now();
    this.coherenceDuration = 300000; // 5 minutes

    // Tunneling probability from wishlist
    this.tunnelProbability = this.calculateTunnelProbability();

    // Uncertainty principle implementation
    this.priceCertainty = 1.0;
    this.stockCertainty = 1.0;
    this.uncertaintyProduct = 0.25; // Heisenberg would be proud
  }

  /**
   * Calculate probability of tunneling from wishlist to cart
   * Based on user behavior patterns and quantum randomness
   */
  calculateTunnelProbability() {
    const timeFactor = Math.sin(Date.now() / 100000) * 0.5 + 0.5; // Daily cycle
    const randomQuantum = Math.random(); // True quantum randomness would use quantum hardware
    return (timeFactor * 0.3) + (randomQuantum * 0.2) + 0.1;
  }

  /**
   * Apply uncertainty principle - trading price certainty for stock certainty
   */
  applyUncertainty(focusOn = 'price') {
    if (focusOn === 'price') {
      this.priceCertainty = 0.95;
      this.stockCertainty = this.uncertaintyProduct / this.priceCertainty;
    } else {
      this.stockCertainty = 0.95;
      this.priceCertainty = this.uncertaintyProduct / this.stockCertainty;
    }
    return this;
  }

  /**
   * COLLAPSE: Force item into classical state
   * This happens at checkout - the "measurement"
   */
  collapse() {
    const random = Math.random();
    let cumulative = 0;

    for (const possibility of this.possibilities) {
      cumulative += possibility.probability;
      if (random <= cumulative) {
        this.collapsedState = possibility;
        this.isCollapsed = true;
        this.collapseTime = Date.now();
        return possibility;
      }
    }

    // Fallback to first possibility
    this.collapsedState = this.possibilities[0];
    this.isCollapsed = true;
    return this.collapsedState;
  }

  /**
   * Check if this item has decohered (lost quantum properties)
   */
  hasDecohered() {
    return Date.now() - this.coherenceStart > this.coherenceDuration;
  }

  /**
   * Get expected value (weighted average of all possibilities)
   */
  getExpectedValue() {
    return this.possibilities.reduce((sum, p) => {
      return sum + (p.quantity * p.price * p.probability);
    }, 0);
  }

  /**
   * Attempt quantum tunneling - move from wishlist to cart
   */
  attemptTunnel() {
    if (Math.random() < this.tunnelProbability) {
      return {
        success: true,
        message: 'Quantum tunneling successful! Item appeared in cart from wishlist',
        tunnelMethod: this.determineTunnelMethod()
      };
    }
    return { success: false, message: 'Tunnel probability too low' };
  }

  determineTunnelMethod() {
    const methods = [
      'Spontaneous appearance',
      'Wormhole shortcut through wishlist',
      'Observer effect manifestation',
      'Probability wave collapse',
      'Entanglement-induced teleportation'
    ];
    return methods[Math.floor(Math.random() * methods.length)];
  }
}

/**
 * Quantum Cart Manager - The Einstein-shocking core
 */
export class QuantumCartManager {
  constructor() {
    this.entangledSessions = new Map(); // Session entanglement registry
    this.waveFunctionCollapseCallbacks = [];
    this.quantumField = new Map(); // Global quantum state
    this.observationHistory = [];
  }

  /**
   * ENTANGLEMENT: Link guest and user sessions
   * Changes to one instantly affect the other (spooky action at a distance)
   */
  entangleSessions(guestSessionId, userSessionId) {
    const entanglementId = uuidv4();
    const bellState = this.createBellState(guestSessionId, userSessionId);

    this.entangledSessions.set(entanglementId, {
      id: entanglementId,
      guestSessionId,
      userSessionId,
      bellState,
      entangledAt: Date.now(),
      coherence: 1.0
    });

    return {
      entanglementId,
      message: 'Sessions entangled! Spooky action at a distance enabled.',
      bellState: bellState.slice(0, 16) + '...' // Truncated for display
    };
  }

  /**
   * Create a Bell state for maximum entanglement
   */
  createBellState(sessionA, sessionB) {
    // Simplified Bell state representation
    const combined = `${sessionA}:${sessionB}`;
    return btoa(combined).split('').reverse().join('');
  }

  /**
   * Transfer quantum state from guest to user
   * Preserves superposition during transfer
   */
  transferQuantumState(guestItems, userId) {
    const transferredItems = guestItems.map(item => {
      // Clone the quantum state
      const quantumItem = new QuantumCartItem(item.product, item.possibilities);
      quantumItem.entangledWith = [item.waveFunctionId]; // Maintain entanglement
      quantumItem.transferredFrom = 'guest-session';
      quantumItem.transferTime = Date.now();
      return quantumItem;
    });

    // Decoherence prevention: Maintain quantum properties for 30 seconds
    setTimeout(() => {
      this.preventDecoherence(transferredItems);
    }, 30000);

    return {
      items: transferredItems,
      preservedStates: transferredItems.length,
      entanglementPreserved: true,
      message: 'Quantum state transferred with superposition intact'
    };
  }

  /**
   * Prevent decoherence by refreshing quantum states
   */
  preventDecoherence(items) {
    items.forEach(item => {
      if (!item.isCollapsed) {
        item.coherenceStart = Date.now(); // Reset coherence timer
        item.lastRefreshed = Date.now();
      }
    });
  }

  /**
   * OBSERVE: Collapse all items to classical state
   * The moment of truth - checkout
   */
  observeCart(cartItems) {
    const observation = {
      timestamp: Date.now(),
      id: uuidv4(),
      collapsedStates: [],
      totalExpectedValue: 0,
      totalObservedValue: 0
    };

    cartItems.forEach(item => {
      const beforeValue = item.getExpectedValue();
      const collapsed = item.collapse();
      const afterValue = collapsed.quantity * collapsed.price;

      observation.collapsedStates.push({
        itemId: item.id,
        beforeValue,
        afterValue,
        collapsedState: collapsed,
        uncertainty: Math.abs(afterValue - beforeValue) / beforeValue
      });

      observation.totalExpectedValue += beforeValue;
      observation.totalObservedValue += afterValue;
    });

    observation.valueDifference = observation.totalObservedValue - observation.totalExpectedValue;
    this.observationHistory.push(observation);

    return {
      observation,
      message: `Cart observed! Wave functions collapsed. Value difference: ${observation.valueDifference.toFixed(2)}`,
      savings: observation.valueDifference < 0 ? Math.abs(observation.valueDifference) : 0,
      surpriseCost: observation.valueDifference > 0 ? observation.valueDifference : 0
    };
  }

  /**
   * Get quantum statistics for the cart
   */
  getQuantumStats(cartItems) {
    return {
      totalPossibilities: cartItems.reduce((sum, item) => sum + item.possibilities.length, 0),
      expectedValue: cartItems.reduce((sum, item) => sum + item.getExpectedValue(), 0),
      coherenceStatus: cartItems.map(item => ({
        id: item.id,
        decohered: item.hasDecohered(),
        remainingCoherence: Math.max(0, item.coherenceDuration - (Date.now() - item.coherenceStart))
      })),
      entanglementCount: this.entangledSessions.size,
      observationCount: this.observationHistory.length,
      averageUncertainty: this.observationHistory.length > 0
        ? this.observationHistory.reduce((sum, obs) => {
            return sum + obs.collapsedStates.reduce((s, cs) => s + cs.uncertainty, 0) / obs.collapsedStates.length;
          }, 0) / this.observationHistory.length
        : 0
    };
  }

  /**
   * Quantum search - find items in superposition matching criteria
   */
  quantumSearch(items, criteria) {
    // Items can match multiple criteria simultaneously (superposition of matches)
    return items.filter(item => {
      const matchProbabilities = [];

      if (criteria.minPrice) {
        const priceMatch = item.possibilities.filter(p => p.price >= criteria.minPrice).length / item.possibilities.length;
        matchProbabilities.push(priceMatch);
      }

      if (criteria.maxPrice) {
        const priceMatch = item.possibilities.filter(p => p.price <= criteria.maxPrice).length / item.possibilities.length;
        matchProbabilities.push(priceMatch);
      }

      if (criteria.inStock) {
        const stockMatch = item.possibilities.filter(p => p.quantity > 0).length / item.possibilities.length;
        matchProbabilities.push(stockMatch);
      }

      // Item matches if average probability > 0.5 (quantum threshold)
      const avgProbability = matchProbabilities.reduce((a, b) => a + b, 0) / matchProbabilities.length;
      return avgProbability > 0.5;
    });
  }
}

// Singleton instance
export const quantumCartManager = new QuantumCartManager();

/**
 * React Hook for Quantum Cart
 */
export const useQuantumCart = () => {
  const [quantumState, setQuantumState] = useState({
    items: [],
    isEntangled: false,
    coherenceLevel: 1.0,
    observationPending: false
  });

  const addToSuperposition = (product, possibilities) => {
    const quantumItem = new QuantumCartItem(product, possibilities);
    setQuantumState(prev => ({
      ...prev,
      items: [...prev.items, quantumItem]
    }));
    return quantumItem;
  };

  const observeCart = () => {
    const result = quantumCartManager.observeCart(quantumState.items);
    setQuantumState(prev => ({
      ...prev,
      observationPending: false,
      lastObservation: result.observation
    }));
    return result;
  };

  const entangleWithSession = (sessionId) => {
    const result = quantumCartManager.entangleSessions(quantumState.sessionId, sessionId);
    setQuantumState(prev => ({
      ...prev,
      isEntangled: true,
      entanglementId: result.entanglementId
    }));
    return result;
  };

  return {
    quantumState,
    addToSuperposition,
    observeCart,
    entangleWithSession,
    getStats: () => quantumCartManager.getQuantumStats(quantumState.items)
  };
};

export default quantumCartManager;
