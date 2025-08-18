const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  name: String,
  ramStorage: String,
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' }
});

module.exports = mongoose.model('Model', modelSchema);
