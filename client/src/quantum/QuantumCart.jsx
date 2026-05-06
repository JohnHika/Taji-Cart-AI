import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Atom,
  Zap,
  Eye,
  GitMerge,
  Activity,
  Sparkles,
  Shuffle,
  Timer
} from 'lucide-react';
import {
  QuantumCartItem,
  quantumCartManager,
  useQuantumCart
} from './QuantumCartState';

/**
 * QUANTUM CART INTERFACE
 *
 * Einstein's famous quote: "God does not play dice with the universe"
 * Our response: "The cart plays dice with your shopping experience"
 *
 * Features:
 * - Visual superposition display (items shimmer between states)
 * - Entanglement visualization (spooky connections between sessions)
 * - Uncertainty meter (Heisenberg would be proud)
 * - Quantum tunneling indicators
 * - Collapse button (the moment of truth)
 */

const QuantumParticle = ({ delay = 0 }) => (
  <motion.div
    className="absolute w-1 h-1 bg-cyan-400 rounded-full"
    animate={{
      scale: [1, 2, 1],
      opacity: [0.5, 1, 0.5],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      delay,
    }}
  />
);

const SuperpositionWave = ({ probability, isActive }) => (
  <motion.div
    className={`h-1 rounded-full ${isActive ? 'bg-purple-500' : 'bg-gray-300'}`}
    style={{ width: `${probability * 100}%` }}
    animate={isActive ? {
      opacity: [0.5, 1, 0.5],
      scaleY: [1, 1.5, 1],
    } : {}}
    transition={{ duration: 1.5, repeat: Infinity }}
  />
);

const EntanglementConnector = ({ from, to, strength }) => (
  <motion.svg
    className="absolute inset-0 pointer-events-none"
    style={{ zIndex: 10 }}
  >
    <motion.path
      d={`M${from.x},${from.y} Q${(from.x + to.x) / 2},${(from.y + to.y) / 2 - 50} ${to.x},${to.y}`}
      fill="none"
      stroke="url(#entanglementGradient)"
      strokeWidth="2"
      strokeDasharray="5,5"
      animate={{
        strokeDashoffset: [0, -20],
        opacity: [0.3, 0.8, 0.3],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "linear",
      }}
    />
    <defs>
      <linearGradient id="entanglementGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={strength} />
        <stop offset="100%" stopColor="#06b6d4" stopOpacity={strength} />
      </linearGradient>
    </defs>
  </motion.svg>
);

const UncertaintyMeter = ({ priceCertainty, stockCertainty }) => {
  const uncertainty = (1 - priceCertainty) * (1 - stockCertainty);

  return (
    <div className="bg-gradient-to-r from-purple-900 to-blue-900 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-cyan-300 text-sm font-mono">Heisenberg Uncertainty</span>
        <span className="text-cyan-300 text-sm font-mono">{uncertainty.toFixed(3)} ℏ</span>
      </div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-purple-300 mb-1">
            <span>Price Certainty</span>
            <span>{(priceCertainty * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${priceCertainty * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-purple-300 mb-1">
            <span>Stock Certainty</span>
            <span>{(stockCertainty * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${stockCertainty * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-400 italic">
        "The more precisely you know the price, the less precisely you can know the stock"
      </div>
    </div>
  );
};

const QuantumCartItemCard = ({ item, onCollapse, onEntangle }) => {
  const [showPossibilities, setShowPossibilities] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(item.isCollapsed);
  const [decoherenceWarning, setDecoherenceWarning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (item.hasDecohered() && !isCollapsed) {
        setDecoherenceWarning(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [item, isCollapsed]);

  const handleCollapse = () => {
    const result = item.collapse();
    setIsCollapsed(true);
    onCollapse?.(result);
  };

  return (
    <motion.div
      layout
      className={`relative p-4 rounded-xl border-2 transition-all ${
        isCollapsed
          ? 'bg-gray-900 border-gray-700'
          : 'bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-500/50'
      }`}
      whileHover={{ scale: 1.02 }}
    >
      {/* Quantum particles */}
      {!isCollapsed && Array.from({ length: 5 }).map((_, i) => (
        <QuantumParticle key={i} delay={i * 0.2} />
      ))}

      {/* Decoherence warning */}
      {decoherenceWarning && !isCollapsed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-3 py-1 rounded-full"
        >
          <Timer className="w-3 h-3 inline mr-1" />
          Decoherence imminent!
        </motion.div>
      )}

      <div className="relative z-10">
        {/* Product info */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-white font-semibold">{item.product?.name || 'Quantum Product'}</h3>
            <div className="text-purple-300 text-sm font-mono">
              Wave Function ID: {item.waveFunctionId.slice(0, 8)}...
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Atom className={`w-5 h-5 ${isCollapsed ? 'text-gray-500' : 'text-cyan-400 animate-spin'}`} />
            {item.entangledWith.length > 0 && (
              <GitMerge className="w-5 h-5 text-purple-400" />
            )}
          </div>
        </div>

        {/* Superposition states */}
        {!isCollapsed && (
          <div className="mb-4">
            <button
              onClick={() => setShowPossibilities(!showPossibilities)}
              className="flex items-center gap-2 text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
            >
              <Eye className="w-4 h-4" />
              {showPossibilities ? 'Hide' : 'Show'} Superposition States
            </button>

            <AnimatePresence>
              {showPossibilities && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 space-y-2"
                >
                  {item.possibilities.map((possibility, idx) => (
                    <div key={idx} className="bg-black/30 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-300 text-sm">
                          State {idx + 1}: {possibility.quantity} × ${possibility.price}
                        </span>
                        <span className="text-cyan-400 font-mono text-sm">
                          {(possibility.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <SuperpositionWave
                        probability={possibility.probability}
                        isActive={idx === 0}
                      />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-3 p-3 bg-purple-900/30 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Expected Value:</span>
                <span className="text-cyan-400 font-mono">
                  ${item.getExpectedValue().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">Tunnel Probability:</span>
                <span className="text-purple-400 font-mono">
                  {(item.tunnelProbability * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed state display */}
        {isCollapsed && item.collapsedState && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-4 bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-lg border border-green-500/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-semibold">Wave Function Collapsed!</span>
            </div>
            <div className="text-white">
              <div className="flex justify-between">
                <span>Quantity:</span>
                <span className="font-mono">{item.collapsedState.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span>Price:</span>
                <span className="font-mono">${item.collapsedState.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-mono text-green-400">
                  ${(item.collapsedState.quantity * item.collapsedState.price).toFixed(2)}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!isCollapsed && (
            <button
              onClick={handleCollapse}
              className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Observe (Collapse)
            </button>
          )}
          <button
            onClick={() => onEntangle?.(item)}
            disabled={isCollapsed}
            className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            <GitMerge className="w-4 h-4" />
            Entangle
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const QuantumCart = ({ items = [], onCheckout }) => {
  const [quantumStats, setQuantumStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [entanglementMode, setEntanglementMode] = useState(false);

  // Convert regular items to quantum items
  const quantumItems = items.map(item =>
    item instanceof QuantumCartItem ? item : new QuantumCartItem(item.product || item)
  );

  useEffect(() => {
    setQuantumStats(quantumCartManager.getQuantumStats(quantumItems));
  }, [quantumItems]);

  const handleGlobalCollapse = () => {
    const result = quantumCartManager.observeCart(quantumItems);
    setQuantumStats(quantumCartManager.getQuantumStats(quantumItems));

    if (result.savings > 0) {
      // Play quantum savings celebration
      console.log(`🎉 Quantum savings: $${result.savings.toFixed(2)}`);
    }

    onCheckout?.(result);
  };

  const allCollapsed = quantumItems.every(item => item.isCollapsed);
  const anyInSuperposition = quantumItems.some(item => !item.isCollapsed);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Atom className="w-10 h-10 text-cyan-400 animate-spin" />
              <motion.div
                className="absolute inset-0"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Atom className="w-10 h-10 text-purple-400" />
              </motion.div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Quantum Cart
              </h1>
              <p className="text-gray-400 text-sm">
                "God does not play dice with the universe... but we do with your cart"
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setEntanglementMode(!entanglementMode)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                entanglementMode
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <GitMerge className="w-4 h-4" />
              {entanglementMode ? 'Exit Entanglement' : 'Entangle'}
            </button>
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              Stats
            </button>
          </div>
        </div>

        {/* Quantum Stats Panel */}
        <AnimatePresence>
          {showStats && quantumStats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-cyan-400">{quantumStats.totalPossibilities}</div>
                    <div className="text-gray-400 text-sm">Total Possibilities</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400">
                      ${quantumStats.expectedValue.toFixed(2)}
                    </div>
                    <div className="text-gray-400 text-sm">Expected Value</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">{quantumStats.entanglementCount}</div>
                    <div className="text-gray-400 text-sm">Entanglements</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-400">
                      {(quantumStats.averageUncertainty * 100).toFixed(1)}%
                    </div>
                    <div className="text-gray-400 text-sm">Avg Uncertainty</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Entanglement Mode Banner */}
        <AnimatePresence>
          {entanglementMode && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-gradient-to-r from-purple-900/50 to-cyan-900/50 rounded-xl border border-purple-500/50"
            >
              <div className="flex items-center gap-3">
                <Shuffle className="w-6 h-6 text-purple-400 animate-pulse" />
                <div>
                  <div className="text-purple-300 font-semibold">Entanglement Mode Active</div>
                  <div className="text-gray-400 text-sm">
                    Click items to create spooky connections. Changes propagate instantly across sessions.
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cart Items */}
        <div className="space-y-4">
          {quantumItems.length === 0 ? (
            <div className="text-center py-16">
              <Atom className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Your quantum cart is in a state of vacuum</p>
              <p className="text-gray-500 text-sm mt-2">Add items to create superposition states</p>
            </div>
          ) : (
            quantumItems.map((item, index) => (
              <QuantumCartItemCard
                key={item.id}
                item={item}
                onCollapse={(result) => console.log('Collapsed:', result)}
                onEntangle={() => console.log('Entangling:', item.id)}
              />
            ))
          )}
        </div>

        {/* Global Actions */}
        {quantumItems.length > 0 && (
          <div className="mt-8 space-y-4">
            {/* Uncertainty Meter */}
            <UncertaintyMeter
              priceCertainty={0.85}
              stockCertainty={0.75}
            />

            {/* Checkout Button */}
            <div className="flex gap-4">
              {anyInSuperposition && (
                <button
                  onClick={handleGlobalCollapse}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-500/25"
                >
                  <Eye className="w-6 h-6" />
                  <span>Observe Cart (Collapse All)</span>
                  <Zap className="w-5 h-5" />
                </button>
              )}

              {allCollapsed && (
                <button
                  onClick={() => onCheckout?.(quantumItems)}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-500/25"
                >
                  <Sparkles className="w-6 h-6" />
                  <span>Checkout (Classical Reality)</span>
                </button>
              )}
            </div>

            {/* Quantum Disclaimer */}
            <div className="text-center text-gray-500 text-sm">
              <p>
                By checking out, you accept that your cart will decohere into classical reality.
              </p>
              <p className="mt-1 italic">
                "I think I can safely say that nobody understands quantum mechanics." — Richard Feynman
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuantumCart;
export { QuantumCartItemCard, UncertaintyMeter, EntanglementConnector };
