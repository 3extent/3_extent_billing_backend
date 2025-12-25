const mongoose = require('mongoose');
const moment = require('moment');

const productSchema = new mongoose.Schema({
  model: { type: mongoose.Schema.Types.ObjectId, ref: 'Model' },
  imei_number: String,
  sales_price: String,
  purchase_price: String,
  gst_purchase_price: String,
  sold_at_price: String,
  grade: String,
  engineer_name: String,
  accessories: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: String,
  qc_remark: String,
  is_repaired: { type: Boolean, default: false },

  //repair details
  issue: { type: String },
  part_cost: { type: Number },
  repairer_cost: { type: Number },
  repair_remark: { type: String },
  repair_started_at: { type: Number, default: moment.utc().valueOf() },
  repair_completed_at: { type: Number, default: moment.utc().valueOf() },
  repair_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  purchase_cost_including_expenses: { type: Number },
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() },
  created_by: String
});

module.exports = mongoose.model('Product', productSchema);
