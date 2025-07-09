// models/PaymentRequest.js
const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
  accountReference: String,
  phoneNumber: String,
  amount: Number,
  status: { type: String, default: 'pending' }, // pending | approved
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);
