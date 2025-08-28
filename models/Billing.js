const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  bill_id: { type: Number, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  total_amount: Number,
  status: String,
  createdAt: String
});

// Auto-increment bill_id before saving
billingSchema.pre('save', async function (next) {
  if (this.isNew && !this.bill_id) {
    try {
      const lastBilling = await this.constructor.findOne({}, {}, { sort: { 'bill_id': -1 } });
      this.bill_id = lastBilling ? lastBilling.bill_id + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Billing', billingSchema);
