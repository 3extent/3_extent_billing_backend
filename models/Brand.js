const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: String,
  created_at: Number,
  updated_at: Number
});

module.exports = mongoose.model('Brand', brandSchema);
