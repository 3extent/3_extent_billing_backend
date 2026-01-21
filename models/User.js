const mongoose = require('mongoose');
const moment = require('moment');

const userSchema = new mongoose.Schema({
  name: String,
  password: String,
  contact_number: String,
  contact_number2: String,
  state: String,
  firm_name: String,
  address: String,
  gst_number: String,
  pan_number: String,
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'UserRole' },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  bills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Billing' }],
  advance_amount: { type: Number, default: 0 },
  total_part_cost: { type: Number, default: 0 },

  // For Repairer - payable_amount=Labor charge - system needs to pay
  // For Supplier - payable_amount=Total cost of all stocks - system needs to pay
  // For Customer - payable_amount=Totat bills - system needs to receive payment
  payable_amount: { type: Number, default: 0 },
  paid_amount: [
    {
      method: String,
      amount: { type: Number, default: 0 }
    },
    {
      method: String,
      amount: { type: Number, default: 0 }
    },
    {
      method: String,
      amount: { type: Number, default: 0 }
    }
  ],//Total amount paid by user

  pending_amount: { type: Number, default: 0 },
  repair_activities: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    part_name: String,
    cost: { type: Number, default: 0 },
    repairer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() },
  created_by: String
});

module.exports = mongoose.model('User', userSchema);
