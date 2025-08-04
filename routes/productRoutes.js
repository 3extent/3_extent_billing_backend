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
    if (model) filter.model = model;

    const products = await Product.find(filter).populate({ path: 'model', populate: { path: 'brand' } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/product
router.post('/products', async (req, res) => {
  try {
    const { products } = req.body;

    // Check if products is an array
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Products must be an array' });
    }

    // Validate each product in the array
    const validProducts = [];
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const { imei_number, sales_price, purchase_price, grade, model } = product;

      // Basic validation
      if (!imei_number || !sales_price || !purchase_price || !grade || !model) {
        errors.push(`Product at index ${i} is missing required fields`);
        continue;
      }

      validProducts.push({ imei_number, sales_price, purchase_price, grade, model });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Create all products
    const createdProducts = await Product.insertMany(validProducts);

    // Populate the model and brand references
    const populatedProducts = await Product.find({
      _id: { $in: createdProducts.map(p => p._id) }
    }).populate({ path: 'model', populate: { path: 'brand' } });

    res.json(populatedProducts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
