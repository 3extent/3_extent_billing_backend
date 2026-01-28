import mongoose from 'mongoose';
import moment from 'moment';

const menuItemSchema = new mongoose.Schema({
    name: String,
    icon: String,
    sub_menus: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubMenuItem' }],
    created_at: { type: Number, default: moment.utc().valueOf() },
    updated_at: { type: Number, default: moment.utc().valueOf() }
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export default MenuItem;