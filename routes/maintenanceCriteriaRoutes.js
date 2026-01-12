const express = require('express');
const router = express.Router();
const moment = require('moment');
const MaintenanceCriteria = require('../models/MaintenanceCriteria');

// GET /api/maintenance_criteria - get maintenance criteria list
router.get('/', async (req, res) => {
  try {
    // const { title } = req.query;

    // let filter = {};
    // if (title) {
    //   filter.title = { $regex: title, $options: 'i' }; // partial, case-insensitive match
    // }

    const maintenanceCriteriaList = await MaintenanceCriteria.find().populate('activities');
    res.json(maintenanceCriteriaList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/maintenance_criteria/:id - get a single maintenance criteria
router.get('/:id', async (req, res) => {
  try {
    const { title, paid_by } = req.query;

    let filter = {};
    if (title) {
      filter.title = { $regex: title, $options: 'i' }; // partial, case-insensitive match
    }
    if (paid_by) {
      const existingUser = await User.findOne({ name });
      if (!existingUser) {
        return res.status(400).json({ error: 'User does not exist' });
      }

      filter.paid_by = existingUser._id; // partial, case-insensitive match
    }
    const maintenanceCriteria = await MaintenanceCriteria.findById(req.params.id).populate('activities');
    res.json(maintenanceCriteria);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maintenance_criteria - create a new maintenance_criteria
router.post('/', async (req, res) => {
  try {
    const { title } = req.body;

    const existingMaintenanceCriteria = await MaintenanceCriteria.findOne({ title });
    if (existingMaintenanceCriteria) {
      return res.status(400).json({ error: 'Maintenance Criteria already exists' });
    }

    const maintenanceCriteria = new MaintenanceCriteria({
      title,
      created_at: moment.utc().valueOf(),
      updated_at: moment.utc().valueOf()
    });
    await maintenanceCriteria.save();
    res.json(maintenanceCriteria);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
