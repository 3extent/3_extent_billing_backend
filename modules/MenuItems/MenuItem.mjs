import mongoose from 'mongoose';
import moment from 'moment';

// A MenuItem with parent = null → Main Menu
// A MenuItem with a non-null parent that points to a main menu → Sub-Menu
// A MenuItem that points to a submenu → Second-Level Item, and so on.
// 1 = main menu, 2 = sub menu, 3 = second level etc.

const menuItemSchema = new mongoose.Schema({
    name: String,
    icon: String,
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', default: null },
    level: { type: Number, default: 1 },
    created_at: { type: Number, default: moment.utc().valueOf() },
    updated_at: { type: Number, default: moment.utc().valueOf() }
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export default MenuItem;