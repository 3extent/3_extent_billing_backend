const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  password: String,
  contact_number: String,
  type: String,
  address: String,
  gst_number: String,
  email: String,
  role: String
});

module.exports = mongoose.model('User', userSchema);
