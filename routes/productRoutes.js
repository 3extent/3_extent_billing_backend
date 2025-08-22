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
    const { imei_number, grade, createdAt, brandName, modelName, status } = req.query;
    let filter = {};

    if (imei_number) {
      filter.imei_number = { $regex: imei_number, $options: 'i' }; // partial, case-insensitive match
    }

    if (grade) {
      filter.grade = { $regex: grade, $options: 'i' }; // partial, case-insensitive match
    }

    if (status) {
      filter.status = { $regex: status, $options: 'i' }; // partial, case-insensitive match
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

// POST /api/products/ - Create single product
router.post('/', async (req, res) => {
  try {
    const productData = req.body;
    const { model_name, imei_number, sales_price, purchase_price, grade, engineer_name, accessories, supplier_name, qc_remark, status } = productData;

    // Find the model by name
    const model = await Model.findOne({ name: model_name });
    if (!model) {
      return res.status(400).json({ error: 'Model not found' });
    }

    // Find the supplier by name
    const supplier = await User.findOne({ name: supplier_name });
    if (!supplier) {
      return res.status(400).json({ error: 'Supplier not found' });
    }

    // IMEI rules:
    // 1) If an existing product with same IMEI has AVAILABLE status -> reject
    // 2) If an existing product with same IMEI has SOLD status -> mark existing as RETURN, new product becomes AVAILABLE
    const existingWithSameImei = await Product.find({ imei_number }).select('status imei_number');
    const hasAvailableExisting = existingWithSameImei.some(p => (p.status || '').toUpperCase() === 'AVAILABLE');
    if (hasAvailableExisting) {
      return res.status(400).json({ error: 'IMEI already exists with AVAILABLE status' });
    }

    const hasSoldExisting = existingWithSameImei.some(p => (p.status || '').toUpperCase() === 'SOLD');
    if (hasSoldExisting) {
      await Product.updateMany(
        { imei_number, status: { $regex: '^SOLD$', $options: 'i' } },
        { status: 'RETURN' }
      );
    }

    const finalStatusForNew = hasSoldExisting ? 'AVAILABLE' : status;

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
      status: finalStatusForNew,
      createdAt: new Date().toISOString()
    });

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
