const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  name: String,
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Model', modelSchema);
