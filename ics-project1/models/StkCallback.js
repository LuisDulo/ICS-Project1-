const mongoose = require('mongoose');

const stkCallbackSchema = new mongoose.Schema({
  MerchantRequestID: String,
  CheckoutRequestID: String,
  ResultCode: Number,
  ResultDesc: String,
  Amount: Number,
  MpesaReceiptNumber: String,
  TransactionDate: Date,
  PhoneNumber: String,
}, { timestamps: true });

module.exports = mongoose.model('StkCallback', stkCallbackSchema);
