const mongoose = require('mongoose');
const moment = require('moment');

const productSchema = new mongoose.Schema({
  model: { type: mongoose.Schema.Types.ObjectId, ref: 'Model' },
  imei_number: String,
  sales_price: String,
  purchase_price: String,
  grade: String,
  engineer_name: String,
  accessories: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: String,
  qc_remark: String,
  created_at: { type: String, default: moment().valueOf() },
  updated_at: { type: String, default: moment().valueOf() }
});

module.exports = mongoose.model('Product', productSchema);
