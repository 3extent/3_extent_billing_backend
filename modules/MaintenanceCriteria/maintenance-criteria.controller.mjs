import moment from 'moment';
import MaintenanceCriteria from './MaintenanceCriteria.mjs';
import User from '../Users/User.mjs';

// GET /api/maintenance_criteria
export const getMaintenanceCriteriaList = async (req, res) => {
  try {
    const { title, from, to } = req.query;

    let filter = {};
    let activity_filter = {};

    if (title) {
      filter.title = { $regex: title, $options: 'i' };
    }

    if (from || to) {
      const range = {};

      if (from) {
        const fromMs = Number(from);
        if (!Number.isNaN(fromMs)) range.$gte = fromMs;
      }

      if (to) {
        const toMs = Number(to);
        if (!Number.isNaN(toMs)) range.$lte = toMs;
      }

      if (Object.keys(range).length) {
        activity_filter.created_at = range;
      }
    }

    let maintenanceCriteriaList = await MaintenanceCriteria.find(filter).populate({
      path: 'activities',
      match: activity_filter,
      populate: { path: 'paid_by' }
    });

    maintenanceCriteriaList = maintenanceCriteriaList.map(mc => {
      const obj = mc.toObject();
      obj.total_expenses_of_maintenance_criteria =
        obj.activities?.reduce(
          (sum, a) => sum + (parseInt(a?.amount) || 0),
          0
        ) || 0;
      return obj;
    });

    const total_expenses_of_maintenance =
      maintenanceCriteriaList.reduce(
        (sum, m) => sum + (parseInt(m.total_expenses_of_maintenance_criteria) || 0),
        0
      );

    res.json({ maintenanceCriteriaList, total_expenses_of_maintenance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/maintenance_criteria/:id
export const getMaintenanceCriteriaById = async (req, res) => {
  try {
    const { paid_by, from, to } = req.query;
    let filter = {};

    if (paid_by) {
      const existingUser = await User.findOne({ name: paid_by });
      if (!existingUser) {
        return res.status(400).json({ error: 'User does not exist' });
      }
      filter.paid_by = existingUser._id;
    }

    if (from || to) {
      const range = {};

      if (from) {
        const fromMs = Number(from);
        if (!Number.isNaN(fromMs)) range.$gte = fromMs;
      }

      if (to) {
        const toMs = Number(to);
        if (!Number.isNaN(toMs)) range.$lte = toMs;
      }

      if (Object.keys(range).length) {
        filter.created_at = range;
      }
    }

    const maintenanceCriteria = await MaintenanceCriteria.findById(
      req.params.id
    ).populate({
      path: 'activities',
      match: filter,
      populate: { path: 'paid_by' }
    });

    if (!maintenanceCriteria) {
      return res.status(404).json({ error: 'Maintenance criteria not found' });
    }

    const total_expenses_of_maintenance_criteria =
      maintenanceCriteria.activities?.reduce(
        (sum, a) => sum + (parseInt(a?.amount) || 0),
        0
      ) || 0;

    res.json({
      maintenanceCriteria,
      total_expenses_of_maintenance_criteria
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/maintenance_criteria
export const createMaintenanceCriteria = async (req, res) => {
  try {
    const { title } = req.body;

    const existing = await MaintenanceCriteria.findOne({ title });
    if (existing) {
      return res.status(400).json({
        error: 'Maintenance Criteria already exists'
      });
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
};
