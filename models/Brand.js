const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: String,
  created_at: String,
  updated_at: String
});

module.exports = mongoose.model('Brand', brandSchema);
