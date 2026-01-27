import mongoose from 'mongoose';
import moment from 'moment';

const maintenanceCriteriaSchema = new mongoose.Schema({
  title: String,
  activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MaintenanceActivity' }],
  // total_expenses_of_maintenance_criteria: Number,
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() }
});

const MaintenanceCriteria = mongoose.model('MaintenanceCriteria', maintenanceCriteriaSchema);
export default MaintenanceCriteria;