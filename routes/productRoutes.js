const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Model = require('../models/Model');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    console.log(req.query);
    const { imei_number, grade, createdAt, brandName, modelName } = req.query;
    let filter = {};

    if (imei_number) {
      filter.imei_number = { $regex: imei_number, $options: 'i' }; // partial, case-insensitive match
    }

    if (grade) {
      filter.grade = { $regex: grade, $options: 'i' }; // partial, case-insensitive match
    }

    if (createdAt) filter.createdAt = createdAt;


    if (brandName) {
      const brandFromDb = await Brand.findOne({ name: { $regex: brandName, $options: 'i' } });
      console.log(brandFromDb);
      if (!brandFromDb) {
        // If no brand found, find models that don't have this brand
        const modelsWithoutBrand = await Model.find({ brand: { $ne: brandFromDb._id } });
        filter.model = { $in: modelsWithoutBrand.map(m => m._id) };
      } else {
        // Find models that belong to this brand
        const modelsWithBrand = await Model.find({ brand: brandFromDb._id });
        filter.model = { $in: modelsWithBrand.map(m => m._id) };
      }
    }

    if (modelName) {
      const modelFromDb = await Model.findOne({ name: { $regex: modelName, $options: 'i' } });
      if (!modelFromDb) {
        filter.model = null;
      } else {
        filter.model = modelFromDb._id;
      }
    }

    console.log(filter);

    const products = await Product.find(filter).populate({ path: 'model', populate: { path: 'brand' } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/
router.post('/', async (req, res) => {
  try {
    const { products } = req.body;

    // Check if products is an array
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Products must be an array', products });
    }

    // ValiString each product in the array
    const validProducts = [];
    const errors = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const { model, imei_number, sales_price, purchase_price, grade, engineer_name, accessories, supplier } = product;
      if (model) {
        const modelFromDb = await Model.findOne({ name: model });
        if (!modelFromDb) {
          return res.status(404).json({ message: 'Model not found' });
        }
        model = modelFromDb._id;
      }
      if (supplier) {
        const supplierFromDb = await User.findOne({ name: supplier });
        if (!supplierFromDb) {
          return res.status(404).json({ message: 'Supplier not found' });
        }
        supplier = supplierFromDb._id;
      }
      // Basic validation
      if (!model || !imei_number || !sales_price || !purchase_price || !grade || !engineer_name || !accessories || !supplier) {
        errors.push(`Product at index ${i} is missing required fields`);
        continue;
      }

      validProducts.push({ model, imei_number, sales_price, purchase_price, grade, engineer_name, accessories, supplier });
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
