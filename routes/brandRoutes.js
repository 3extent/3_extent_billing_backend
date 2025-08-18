const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');


// GET /api/brands?name="Samsung"
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


// POST /api/brand
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    const existingBrand = await Brand.findOne({ name });
    if (existingBrand) {
      return res.status(400).json({ error: 'Brand already exists' });
    }

    const brand = new Brand({ name });
    await brand.save();
    res.json(brand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
