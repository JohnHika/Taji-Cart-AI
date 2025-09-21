import mongoose from 'mongoose';

const mpesaPaymentSchema = new mongoose.Schema({
  checkoutRequestId: { type: String, index: true, unique: true },
  merchantRequestId: { type: String },
  phoneNumber: { type: String },
  amount: { type: Number },
  status: { type: String, enum: ['pending','success','failed'], default: 'pending' },
  resultCode: { type: Number },
  resultDesc: { type: String },
  rawCallback: { type: Object },
}, { timestamps: true });

const MpesaPayment = mongoose.model('mpesa_payment', mpesaPaymentSchema);

export default MpesaPayment;
