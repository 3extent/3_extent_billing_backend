const mongoose = require('mongoose');
const moment = require('moment');

const billingSchema = new mongoose.Schema({
  invoice_number: { type: Number, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
  net_total: { type: String, required: true },
  c_gst: { type: String},
  s_gst: { type: String},
  profitToShow: { type: String, required: true },
  actualProfit: { type: String, required: true },
  status: { type: String, required: true },
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() },
  created_by: String
});

// Auto-increment bill_id before saving
billingSchema.pre('save', async function (next) {
  if (this.isNew && !this.invoice_number) {
    try {
      const lastBilling = await this.constructor.findOne({}, {}, { sort: { 'invoice_number': -1 } });
      this.invoice_number = lastBilling ? lastBilling.invoice_number + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Billing', billingSchema);
