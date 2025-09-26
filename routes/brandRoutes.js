const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');
const moment = require('moment');

// GET /api/brands?name="Samsung" - get all brands
router.get('/', async (req, res) => {
  try {
    const { name } = req.query;

    let filter = {};
    if (name) {
      filter.name = { $regex: name, $options: 'i' }; // partial, case-insensitive match
    }

    const brands = await Brand.find(filter);
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/brand - create a new brand
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    const existingBrand = await Brand.findOne({ name });
    if (existingBrand) {
      return res.status(400).json({ error: 'Brand already exists' });
    }

    const brand = new Brand({
      name,
      created_at: moment.utc().valueOf(),
      updated_at: moment.utc().valueOf()
    });
    await brand.save();
    res.json(brand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/brand/:id - get a single brand
router.get('/:id', async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    res.json(brand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/brand/:id - update a single brand
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const existingBrand = await Brand.findOne({ name });
    if (existingBrand) {
      return res.status(400).json({ error: 'Brand already exists' });
    }
    const brand = await Brand.findByIdAndUpdate(req.params.id,
      {
        name,
        updated_at: moment.utc().valueOf()
      },
      { new: true });
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }
    res.json(brand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
})

module.exports = router;
