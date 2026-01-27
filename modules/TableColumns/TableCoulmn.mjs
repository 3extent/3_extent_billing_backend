import mongoose from 'mongoose';
import moment from 'moment';

const tableColumnSchema = new mongoose.Schema({
  name: String,
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() }
});

module.exports = mongoose.model('TableColumn', tableColumnSchema);
