import mongoose from 'mongoose';

const equityPaymentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  phoneNumber: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  items: [{
    productId: String,
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  subTotalAmt: {
    type: Number,
    default: 0
  },
  totalAmt: {
    type: Number,
    required: true
  },
  communityRewardId: String,
  communityDiscountAmount: {
    type: Number,
    default: 0
  },
  fulfillment_type: {
    type: String,
    enum: ['delivery', 'pickup'],
    default: 'delivery'
  },
  pickup_location: String,
  pickup_instructions: String,
  addressId: String,
  callbackData: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

const EquityOrder = mongoose.model('EquityPayment', equityPaymentSchema);

export default EquityOrder;
