const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  imei_number: Number,
  sales_price: Number,
  purchase_price: Number,
  grade: String,
  model: { type: mongoose.Schema.Types.ObjectId, ref: 'Model' }
});

module.exports = mongoose.model('Product', productSchema);
