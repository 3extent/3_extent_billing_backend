const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  billing_String: String,
  total_amount: Number,
  payment_status: String,
  payment_String: String,
  status: String,
  createdAt: String
});

module.exports = mongoose.model('User', billingSchema);
