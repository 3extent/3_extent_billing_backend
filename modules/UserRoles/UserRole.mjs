import mongoose from 'mongoose';
import moment from 'moment';

const userRoleSchema = new mongoose.Schema({
    name: String,
    menu_items: [{
        name: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
        show_table_columns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TableColumn' }],
        hidden_dropdown_table_columns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TableColumn' }]
    }],
    created_at: { type: Number, default: moment.utc().valueOf() },
    updated_at: { type: Number, default: moment.utc().valueOf() }
});

const UserRole = mongoose.model('UserRole', userRoleSchema);
export default UserRole;