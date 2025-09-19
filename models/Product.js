const mongoose = require('mongoose');

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
  created_at: { type: Date, default: new Date() },
  updated_at: { type: Date, default: new Date() }
});

module.exports = mongoose.model('Product', productSchema);
