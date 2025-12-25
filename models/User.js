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
  role: String,
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  total_amount: String,
  paid_amount: String,
  pending_amount: String,
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() },
  created_by: String
});

module.exports = mongoose.model('User', userSchema);
