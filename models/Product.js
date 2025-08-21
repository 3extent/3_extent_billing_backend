const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  product_id: { type: Number, unique: true },
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
  createdAt: String
});

// Auto-increment product_id before saving
productSchema.pre('save', async function(next) {
  if (this.isNew && !this.product_id) {
    try {
      const lastModel = await this.constructor.findOne({}, {}, { sort: { 'product_id': -1 } });
      this.product_id = lastModel ? lastModel.product_id + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
