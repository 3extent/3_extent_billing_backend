const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_id: { type: Number, unique: true },
  name: String,
  password: String,
  contact_number: String,
  type: String,
  address: String,
  gst_number: String,
  email: String,
  role: String
});

// Auto-increment user_id before saving
userSchema.pre('save', async function (next) {
  if (this.isNew && !this.user_id) {
    try {
      const lastUser = await this.constructor.findOne({}, {}, { sort: { 'user_id': -1 } });
      console.log(this.lastUser)
      this.user_id = lastUser ? lastUser.user_id + 1 : 1;
      console.log(this.user_id)
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
