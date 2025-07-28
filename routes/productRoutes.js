const express = require('express');
const router = express.Router();
const Product = require('../models/Product');


// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { createdAt, brand, model } = req.query;
    const filter = {};

    if (createdAt) filter.createdAt = createdAt;
    if (brand) filter.brand = brand;
    // if (model) filter.model = model;

    const products = await Product.find(filter);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
