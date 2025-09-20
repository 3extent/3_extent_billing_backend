const mongoose = require('mongoose');
const moment = require('moment');

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
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() }
});

module.exports = mongoose.model('Billing', billingSchema);
