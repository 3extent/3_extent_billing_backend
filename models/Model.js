const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  name: String,
  ram: String,
  storage: String,
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' }
});

module.exports = mongoose.model('Model', modelSchema);
