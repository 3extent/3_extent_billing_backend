const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');


// GET /api/brands?name="Samsung"
router.get('/', async (req, res) => {
  try {
    const { name } = req.query;
    const filter = {};

    if (name) filter.name = name;

    const brands = await Brand.find(filter);
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/brand
router.post('/brand', async (req, res) => {
  try {
    const { name } = req.body;
    const brand = new Brand({ name });
    await brand.save();
    res.json(brand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
