import mongoose from 'mongoose';
import moment from 'moment';

const modelSchema = new mongoose.Schema({
  name: String,
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() }
});


module.exports = mongoose.model('Model', modelSchema);
