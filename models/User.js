const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  password: String,
  contact_number: String,
  contact_number2: String,
  state: String,
  firm_name: String,
  address: String,
  gst_number: String,
  pan_number: String,
  role: String,
  created_at: String,
  updated_at: String
});

module.exports = mongoose.model('User', userSchema);
