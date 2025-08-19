const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Model = require('../models/Model');
const User = require('../models/User');

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

    const products = await Product.find(filter).populate({ path: 'model', populate: { path: 'brand' } }).populate('supplier');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/ - Create single or multiple products
router.post('/', async (req, res) => {
  try {
    const productsData = Array.isArray(req.body) ? req.body : [req.body];
    const createdProducts = [];
    const errors = [];

    for (let i = 0; i < productsData.length; i++) {
      const productData = productsData[i];
      const { model_name, imei_number, sales_price, purchase_price, grade, engineer_name, accessories, supplier_name, qc_remark, status } = productData;

      try {
        // Find the model by name
        const model = await Model.findOne({ name: model_name });
        if (!model) {
          errors.push({ index: i, error: 'Model not found', data: productData });
          continue;
        }

        // Find the supplier by name
        const supplier = await User.findOne({ name: supplier_name });
        if (!supplier) {
          errors.push({ index: i, error: 'Supplier not found', data: productData });
          continue;
        }

        // Create new product
        const product = new Product({
          model,
          imei_number,
          sales_price,
          purchase_price,
          grade,
          engineer_name,
          accessories,
          supplier,
          qc_remark,
          status,
          createdAt: new Date().toISOString()
        });

        await product.save();
        createdProducts.push(product);
      } catch (productError) {
        errors.push({ index: i, error: productError.message, data: productData });
      }
    }

    // Return results
    if (createdProducts.length === 0) {
      return res.status(400).json({
        error: 'No products were created',
        errors
      });
    }

    if (errors.length > 0) {
      return res.status(207).json({ // 207 Multi-Status
        message: 'Some products were created successfully',
        created: createdProducts.length,
        failed: errors.length,
        createdProducts,
        errors
      });
    }

    // All products created successfully
    if (productsData.length === 1) {
      res.json(createdProducts[0]); // Return single product for backward compatibility
    } else {
      res.json({
        message: 'All products created successfully',
        count: createdProducts.length,
        products: createdProducts
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
