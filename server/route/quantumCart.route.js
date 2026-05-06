/**
 * QUANTUM CART ROUTES
 *
 * API endpoints for quantum superposition cart operations
 * Where the magic (and the physics violations) happen
 */

const { Router } = require('express');
const router = Router();
const auth = require('../middleware/auth');
const {
  createQuantumOrder,
  getQuantumStats,
  getQuantumOrders,
  simulateQuantumFluctuations,
  entangleSessions
} = require('../controllers/quantumCart.controller');

/**
 * @route   POST /api/quantum/order
 * @desc    Create order from collapsed quantum state
 * @access  Private (or Guest)
 */
router.post('/order', auth, createQuantumOrder);

/**
 * @route   GET /api/quantum/stats
 * @desc    Get quantum order statistics
 * @access  Admin
 */
router.get('/stats', auth, getQuantumStats);

/**
 * @route   GET /api/quantum/orders
 * @desc    Get user's quantum order history
 * @access  Private
 */
router.get('/orders', auth, getQuantumOrders);

/**
 * @route   POST /api/quantum/simulate
 * @desc    Simulate quantum fluctuations for testing
 * @access  Admin
 */
router.post('/simulate', auth, simulateQuantumFluctuations);

/**
 * @route   POST /api/quantum/entangle
 * @desc    Entangle guest and user sessions
 * @access  Public
 */
router.post('/entangle', entangleSessions);

/**
 * @route   GET /api/quantum/principle
 * @desc    Get Heisenberg uncertainty principle info
 * @access  Public
 */
router.get('/principle', (req, res) => {
  res.json({
    success: true,
    data: {
      principle: 'Heisenberg Uncertainty Principle',
      equation: 'Δp × Δx ≥ ℏ/2',
      appliedTo: 'E-commerce',
      interpretation: 'The more precisely you know the price, the less precisely you can know the stock availability',
      einsteinQuote: 'God does not play dice with the universe',
      ourResponse: 'But we do with your shopping cart',
      warning: 'By using this system, you accept that your cart exists in a superposition of states until observed'
    }
  });
});

/**
 * @route   GET /api/quantum/schrodinger
 * @desc    Check if cart is alive or dead
 * @access  Public
 */
router.get('/schrodinger', (req, res) => {
  const isAlive = Math.random() > 0.5;

  res.json({
    success: true,
    data: {
      catStatus: isAlive ? 'ALIVE' : 'DEAD',
      paradox: 'The cart is both empty and full until you observe it',
      solution: 'Open the cart to collapse the wave function',
      quantumState: isAlive ? '🐱' : '💀',
      message: isAlive
        ? 'Congratulations! Your cart survived the quantum measurement.'
        : 'Your cart has decohered. Please create a new superposition.'
    }
  });
});

module.exports = router;
