const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  model_id: { type: Number, unique: true },
  name: String,
  ramStorage: String,
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' }
});

// Auto-increment model_id before saving
modelSchema.pre('save', async function(next) {
  if (this.isNew && !this.model_id) {
    try {
      const lastModel = await this.constructor.findOne({}, {}, { sort: { 'model_id': -1 } });
      this.model_id = lastModel ? lastModel.model_id + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Model', modelSchema);
