const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  total_amount: Number,
  status: String,
  createdAt: String
});

module.exports = mongoose.model('Billing', billingSchema);
