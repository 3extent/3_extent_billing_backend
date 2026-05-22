import moment from 'moment';
import MaintenanceActivity from './MaintenanceActivity.mjs';
import MaintenanceCriteria from '../MaintenanceCriteria/MaintenanceCriteria.mjs';
import User from '../Users/User.mjs';

// POST /api/maintenance_activity
export const createMaintenanceActivity = async (req, res) => {
  try {
    const {
      title,
      description,
      amount,
      image,
      paid_by,
      created_at
    } = req.body;

    const existingMaintenanceCriteria =
      await MaintenanceCriteria.findOne({ title }).populate('activities');

    if (!existingMaintenanceCriteria) {
      return res.status(400).json({ error: 'Maintenance criteria does not exist' });
    }

    const existingUser = await User.findOne({ name: paid_by });
    if (!existingUser) {
      return res.status(400).json({ error: 'User does not exist' });
    }

    // Create maintenance activity
    const maintenanceActivity = new MaintenanceActivity({
      title: existingMaintenanceCriteria._id,
      description,
      amount,
      image,
      paid_by: existingUser._id,
      created_at: created_at || moment.utc().valueOf(),
      updated_at: moment.utc().valueOf()
    });

    await maintenanceActivity.save();

    // Add activity to criteria
    const activities = existingMaintenanceCriteria.activities || [];
    activities.push(maintenanceActivity._id);

    const maintenanceCriteria =
      await MaintenanceCriteria.findByIdAndUpdate(
        existingMaintenanceCriteria._id,
        {
          activities,
          updated_at: moment.utc().valueOf()
        },
        { new: true }
      ).populate('activities');

    res.json(maintenanceCriteria);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
