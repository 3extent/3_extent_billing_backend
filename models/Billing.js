const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  payable_amount: { type: String, required: true },
  paid_amount: [
    {
      method: String,
      amount: String
    },
    {
      method: String,
      amount: String
    },
    {
      method: String,
      amount: String
    }
  ],
  pending_amount: { type: String, required: true },
  profit: { type: String, required: true },
  status: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Billing', billingSchema);
