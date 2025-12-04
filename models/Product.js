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

  //repair details
  issue: { type: String },
  repair_cost: { type: Number },
  repair_remark: { type: String },
  repair_started_at: { type: Number },
  repair_completed_at: { type: Number },
  repair_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() },
  created_by: String
});

module.exports = mongoose.model('Product', productSchema);
