const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  name: String,
  ram: Number,
  storage: Number,
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' }
});

module.exports = mongoose.model('Model', modelSchema);
