import mongoose from 'mongoose';
import moment from 'moment';

const SubMenuItemSchema = new mongoose.Schema({
  name: String,
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() }
});

const SubMenuItem = mongoose.model('SubMenuItem', SubMenuItemSchema);
export default SubMenuItem;