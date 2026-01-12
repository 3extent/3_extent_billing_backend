const mongoose = require('mongoose');
const moment = require('moment');

const maintenanceCriteriaSchema = new mongoose.Schema({
  title: String,
  activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceActivity' }],
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() }
});

module.exports = mongoose.model('MaintenanceCriteria', maintenanceCriteriaSchema);
