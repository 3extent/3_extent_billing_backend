const express = require('express');
const router = express.Router();
const Product = require('../models/Product');


// GET /api/products
router.get('/', async (req, res) => {
  try {
    // const { createdAt, brand } = req.query;
    // const filter = {};

    // if (createdAt) filter.createdAt = createdAt;
    // if (brand) filter.brand = brand;
    // if (model) filter.model = model;

    const products = await Product.find({});
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/product
router.post('/', async (req, res) => {
  try {
    const { imei_number, sales_price, purchase_price, grade, model } = req.body;
    const product = new Product({ imei_number, sales_price, purchase_price, grade, model });
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
