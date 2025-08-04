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
      const brandName = await Brand.findOne({ name: { $regex: brandName, $options: 'i' } });
      if (!brandName) {
        return res.status(404).json({ message: 'Brand not found' });
      }
      filter.brand = brandName._id;
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
    const { name, brand } = req.body;
    const model = new Model({ name, brand });
    await model.save();
    res.json(model);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
