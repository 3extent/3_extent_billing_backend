const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  brand_id: { type: Number, unique: true },
  name: String,
});

// Auto-increment brand_id before saving
brandSchema.pre('save', async function (next) {
  if (this.isNew && !this.brand_id) {
    try {
      const lastBrand = await this.constructor.findOne({}, {}, { sort: { 'brand_id': -1 } });
      this.brand_id = lastBrand ? lastBrand.brand_id + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Brand', brandSchema);
