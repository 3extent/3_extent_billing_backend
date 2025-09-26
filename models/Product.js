const mongoose = require('mongoose');
const moment = require('moment');

const productSchema = new mongoose.Schema({
  model: { type: mongoose.Schema.Types.ObjectId, ref: 'Model' },
  imei_number: String,
  sales_price: String,
  purchase_price: String,
  sales_at_price: String,
  grade: String,
  engineer_name: String,
  accessories: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: String,
  qc_remark: String,
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() },
  created_by: String
});

module.exports = mongoose.model('Product', productSchema);
