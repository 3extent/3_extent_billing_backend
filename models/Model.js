const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  name: String,
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  created_at: Number,
  updated_at: Number
});


module.exports = mongoose.model('Model', modelSchema);
