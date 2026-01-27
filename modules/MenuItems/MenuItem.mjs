import mongoose from 'mongoose';
import moment from 'moment';

const menuItemSchema = new mongoose.Schema({
    name: String,
    icon: String,
    created_at: { type: Number, default: moment.utc().valueOf() },
    updated_at: { type: Number, default: moment.utc().valueOf() }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
