import mongoose from 'mongoose';
import moment from 'moment';

const brandSchema = new mongoose.Schema({
  name: String,
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() }
});

export default mongoose.model('Brand', brandSchema);
