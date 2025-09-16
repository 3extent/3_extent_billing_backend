const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  payable_amount: String,
  paid_amount: [
    { method: String, amount: String },
    { method: String, amount: String },
    { method: String, amount: String }
  ],
  pending_amount: String,
  profit: String,
  status: String,
  createdAt: String
});

module.exports = mongoose.model('Billing', billingSchema);
