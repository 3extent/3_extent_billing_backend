const express = require('express');
const router = express.Router();
const moment = require('moment');
const MaintenanceActivity = require('../models/MaintenanceActivity');
const MaintenanceCriteria = require('../models/MaintenanceCriteria');
const User = require('../models/User');


// // GET /api/maintenance?title="Payment" - get maintenance list
// router.get('/', async (req, res) => {
//   try {
//     const { title } = req.query;

//     let filter = {};
//     if (title) {
//       filter.title = { $regex: title, $options: 'i' }; // partial, case-insensitive match
//     }

//     const maintenanceActivityList = await MaintenanceActivity.find(filter);
//     res.json(maintenanceActivityList);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });


// POST /api/maintenance_activity - create a new maintenance activity
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      amount,
      image,
      paid_by,
      created_at } = req.body;

    const existingMaintenanceCriteria = await MaintenanceCriteria.findOne({ title });
    if (!existingMaintenanceCriteria) {
      return res.status(400).json({ error: 'Maintenance criteria does not exist' });
    }

    const existingUser = await User.findOne({ name: paid_by });
    if (!existingUser) {
      return res.status(400).json({ error: 'User does not exist' });
    }

    //Activity added to the system
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
    console.log('maintenanceActivity: ', maintenanceActivity);
    console.log('existingMaintenanceCriteria: ', existingMaintenanceCriteria);
    console.log('maintenanceActivity._id: ', maintenanceActivity._id);
    console.log('existingMaintenanceCriteria["activities"]: ', existingMaintenanceCriteria["activities"]);

    let activities = existingMaintenanceCriteria["activities"].push(maintenanceActivity._id)
    console.log('activities: ', activities);
    //Activity added in the criteria
    const maintenanceCriteria = await MaintenanceCriteria.findByIdAndUpdate(existingMaintenanceCriteria._id,
      {
        activities: activities,
        updated_at: moment.utc().valueOf()
      },
      { new: true }
    ).populate('activities');

    console.log('maintenanceCriteria: ', maintenanceCriteria);

    res.json(maintenanceCriteria);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
