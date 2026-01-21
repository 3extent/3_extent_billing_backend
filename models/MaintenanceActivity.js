const mongoose = require('mongoose');
const moment = require('moment');

const maintenanceActivitySchema = new mongoose.Schema({
  // title: { type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceCriteria' },
  description: String,
  amount: { type: Number, default: 0 },
  image: String,
  paid_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() }
});

module.exports = mongoose.model('MaintenanceActivity', maintenanceActivitySchema);
