const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  model: { type: mongoose.Schema.Types.ObjectId, ref: 'Model' },
  imei_number: Number,
  sales_price: Number,
  purchase_price: Number,
  grade: String,
  engineer_name: String,
  accessories: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: String
});

module.exports = mongoose.model('Product', productSchema);
