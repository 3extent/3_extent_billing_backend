import mongoose from 'mongoose';
import moment from 'moment';

const SecondLevelItemSchema = new mongoose.Schema({
  name: String,
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() }
});

const SecondLevelItem = mongoose.model('SecondLevelItem', SecondLevelItemSchema);
export default SecondLevelItem;