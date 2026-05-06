/**
 * QUANTUM CART CONTROLLER
 *
 * Server-side handling of quantum superposition cart
 * Einstein would be spinning... wait, that's a different phenomenon
 */

const Order = require('../models/order.model');
const Product = require('../models/product.model');
const { v4: uuidv4 } = require('uuid');

/**
 * Create order from collapsed quantum state
 * POST /api/quantum/order
 */
const createQuantumOrder = async (req, res) => {
  try {
    const {
      items,
      observationId,
      expectedValue,
      observedValue,
      quantumSavings,
      shippingAddress,
      paymentMethod
    } = req.body;

    const userId = req.user?._id || req.session?.guestSessionId;

    // Validate collapsed items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No collapsed quantum states provided'
      });
    }

    // Create order items from collapsed quantum states
    const orderItems = [];
    const quantumMetadata = {
      observationId,
      expectedValue,
      observedValue,
      quantumSavings,
      waveFunctionCollapseTime: new Date(),
      uncertaintyBeforeCollapse: Math.abs(observedValue - expectedValue) / expectedValue
    };

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found in this universe`
        });
      }

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        productDetails: {
          name: product.name,
          image: product.image[0],
          unit: product.unit
        }
      });
    }

    // Calculate final amounts
    const totalAmount = orderItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Create order with quantum metadata
    const order = new Order({
      userId,
      orderId: `Q-${uuidv4().slice(0, 8).toUpperCase()}`,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      status: 'PENDING',
      quantumMetadata,
      isQuantumOrder: true
    });

    await order.save();

    // Update product stock (classical reality now)
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Quantum order created successfully',
      data: {
        orderId: order.orderId,
        totalAmount,
        quantumSavings,
        uncertainty: quantumMetadata.uncertaintyBeforeCollapse,
        observationId,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Quantum order creation failed:', error);
    res.status(500).json({
      success: false,
      message: 'Wave function collapsed unexpectedly',
      error: error.message
    });
  }
};

/**
 * Get quantum order statistics
 * GET /api/quantum/stats
 */
const getQuantumStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      { $match: { isQuantumOrder: true } },
      {
        $group: {
          _id: null,
          totalQuantumOrders: { $sum: 1 },
          totalQuantumSavings: { $sum: '$quantumMetadata.quantumSavings' },
          avgUncertainty: { $avg: '$quantumMetadata.uncertaintyBeforeCollapse' },
          totalExpectedValue: { $sum: '$quantumMetadata.expectedValue' },
          totalObservedValue: { $sum: '$quantumMetadata.observedValue' }
        }
      }
    ]);

    const dailyStats = await Order.aggregate([
      { $match: { isQuantumOrder: true } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          savings: { $sum: '$quantumMetadata.quantumSavings' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalQuantumOrders: 0,
          totalQuantumSavings: 0,
          avgUncertainty: 0
        },
        daily: dailyStats,
        heisenbergCompliance: 'UNCERTAIN'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to observe quantum statistics',
      error: error.message
    });
  }
};

/**
 * Get user's quantum order history
 * GET /api/quantum/orders
 */
const getQuantumOrders = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.find({
      userId,
      isQuantumOrder: true
    })
      .sort({ createdAt: -1 })
      .populate('items.productId', 'name image');

    res.json({
      success: true,
      data: orders
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve quantum orders',
      error: error.message
    });
  }
};

/**
 * Simulate quantum fluctuations (for testing)
 * POST /api/quantum/simulate
 */
const simulateQuantumFluctuations = async (req, res) => {
  try {
    const { productId, iterations = 1000 } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Simulate quantum fluctuations
    const fluctuations = [];
    for (let i = 0; i < iterations; i++) {
      const random = Math.random();
      let quantity = 1;
      let price = product.price;

      if (random < 0.3) {
        quantity = 2;
        price = product.price * 0.95; // Bundle discount
      } else if (random > 0.9) {
        quantity = 0; // Out of stock
        price = 0;
      }

      fluctuations.push({ quantity, price });
    }

    const expectedValue = fluctuations.reduce((sum, f) => sum + (f.quantity * f.price), 0) / iterations;

    res.json({
      success: true,
      data: {
        product: product.name,
        iterations,
        expectedValue,
        fluctuations: fluctuations.slice(0, 100), // Return first 100 for display
        uncertainty: Math.sqrt(
          fluctuations.reduce((sum, f) => sum + Math.pow(f.quantity * f.price - expectedValue, 2), 0) / iterations
        )
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Quantum simulation failed',
      error: error.message
    });
  }
};

/**
 * Entangle user session with guest session
 * POST /api/quantum/entangle
 */
const entangleSessions = async (req, res) => {
  try {
    const { guestSessionId, userSessionId } = req.body;

    // Create Bell state representation
    const bellState = Buffer.from(`${guestSessionId}:${userSessionId}`).toString('base64');
    const entanglementId = uuidv4();

    // Store entanglement in session/database
    // In a real implementation, this would use Redis or similar

    res.json({
      success: true,
      data: {
        entanglementId,
        bellState: bellState.slice(0, 32) + '...',
        message: 'Sessions entangled! Spooky action at a distance enabled.',
        warning: 'Do not attempt to measure both sessions simultaneously'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Entanglement failed',
      error: error.message
    });
  }
};

module.exports = {
  createQuantumOrder,
  getQuantumStats,
  getQuantumOrders,
  simulateQuantumFluctuations,
  entangleSessions
};
