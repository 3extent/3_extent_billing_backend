const mongoose = require('mongoose');
const moment = require('moment');

const userRoleSchema = new mongoose.Schema({
    name: String,
    menu_items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
    created_at: { type: Number, default: moment.utc().valueOf() },
    updated_at: { type: Number, default: moment.utc().valueOf() }
});

module.exports = mongoose.model('UserRole', userRoleSchema);
