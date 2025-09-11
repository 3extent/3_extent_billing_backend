const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema({
  name: String,
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  created_at: String,
  updated_at: String
});


module.exports = mongoose.model('Model', modelSchema);
