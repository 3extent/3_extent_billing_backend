const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');
const Model = require('../models/Model');

// GET /models?modelName=Iphone&brandName=Samsung
router.get('/', async (req, res) => {
  try {
    const modelName = req.query.modelName;
    const brandName = req.query.brandName;

    let filter = {};

    // Step 1: If brand name is provided, find brand's ObjectId
    if (brandName) {
      const brandFromDb = await Brand.findOne({ name: { $regex: brandName, $options: 'i' } });
      if (!brandFromDb) {
        return res.status(404).json({ message: 'Brand not found' });
      }
      filter.brand = brandFromDb._id;
    }

    // Step 2: If model name is provided, add to filter
    if (modelName) {
      filter.name = { $regex: modelName, $options: 'i' }; // case-insensitive match
    }

    const models = await Model.find(filter).populate('brand');

    res.json(models);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/models
router.post('/', async (req, res) => {
  try {
    const { name, brand, ramStorage } = req.body;

    if (!name || !brand) {
      return res.status(400).json({ error: 'name and brand are required' });
    }

    const ramStorageList = Array.isArray(ramStorage)
      ? ramStorage
      : (ramStorage ? [ramStorage] : []);

    if (ramStorageList.length === 0) {
      return res.status(400).json({ error: 'ramStorage is required' });
    }

    const created = [];
    const skipped = [];

    for (const ram of ramStorageList) {
      const exists = await Model.findOne({ name, brand, ramStorage: ram });
      if (exists) {
        skipped.push(ram);
        continue;
      }

      const model = new Model({ name, brand, ramStorage: ram });
      try {
        await model.save();
        created.push(model);
      } catch (e) {
        if (e && e.code === 11000) {
          skipped.push(ram);
          continue;
        }
        throw e;
      }
    }

    return res.status(201).json({
      createdCount: created.length,
      created,
      skipped,
      message: skipped.length
        ? 'Some models already existed and were skipped'
        : 'Models created'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
