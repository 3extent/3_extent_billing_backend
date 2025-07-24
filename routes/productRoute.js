const express = require('express');
const router = express.Router();
const Product = require('../models/Product');


// GET /api/products
router.get('/products', async (req, res) => {
  try {
    // const { brand, model, grade } = req.query;
    // const filter = {};

    // if (role) filter.role = role;
    // if (mobile_number) filter.mobile_number = mobile_number;
    // if (company_name) filter.company_name = company_name;
    // if (name) filter.name = name;

    const products = await Product.find({});
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
