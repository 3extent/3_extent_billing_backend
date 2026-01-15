const express = require('express');
const router = express.Router();
const moment = require('moment');
const MaintenanceCriteria = require('../models/MaintenanceCriteria');
const User = require('../models/User');

// GET /api/maintenance_criteria - get maintenance criteria list
router.get('/', async (req, res) => {
  try {
    const { title } = req.query;

    let filter = {};
    if (title) {
      filter.title = { $regex: title, $options: 'i' }; // partial, case-insensitive match
    }

    const maintenanceCriteriaList = await MaintenanceCriteria.find(filter).populate('activities');
    console.log('maintenanceCriteriaList: ', maintenanceCriteriaList)
    res.json(maintenanceCriteriaList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/maintenance_criteria/:id - get a single maintenance criteria
router.get('/:id', async (req, res) => {
  try {
    const { paid_by, from, to } = req.query;

    let filter = {};

    if (paid_by) {
      const existingUser = await User.findOne({ name: paid_by });
      if (!existingUser) {
        return res.status(400).json({ error: 'User does not exist' });
      }

      filter.paid_by = existingUser._id; // partial, case-insensitive match
    }

    if (from || to) {
      const range = {};

      if (from) {
        const fromMs = Number(from);
        if (!Number.isNaN(fromMs)) {
          const fromDate = fromMs;
          range.$gte = fromDate;
        }
      }

      if (to) {
        const toMs = Number(to);
        if (!Number.isNaN(toMs)) {
          const toDate = toMs;
          range.$lte = toDate;
        }
      }

      if (Object.keys(range).length > 0) {
        filter.created_at = range;
      }

      console.log("Date range filter:", range);
    }
    const maintenanceCriteria = await MaintenanceCriteria.findById(req.params.id).populate({
      path: 'activities',
      match: filter,
      populate: {
        path: 'paid_by'
      }
    });
    console.log('maintenanceCriteria: ', maintenanceCriteria)

    if (!maintenanceCriteria) {
      return res.status(404).json({ error: 'Maintenance criteria not found' });
    }
    let total_expenses_of_maintenance_criteria = maintenanceCriteria.activities.reduce((sum, activity) => sum + (parseInt(activity.amount) || 0), 0);
    console.log('total_expenses_of_maintenance_criteria: ', total_expenses_of_maintenance_criteria)
    res.json({
      maintenanceCriteria,
      total_expenses_of_maintenance_criteria
    });
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
