const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Model = require('../models/Model');
const User = require('../models/User');
const moment = require('moment');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    console.log(req.query);
    const { imei_number, grade, brandName, modelName, status, from, to } = req.query;
    let filter = {};

    if (imei_number) {
      filter.imei_number = { $regex: imei_number, $options: 'i' }; // partial, case-insensitive match
    }

    if (grade) {
      filter.grade = { $regex: grade, $options: 'i' }; // partial, case-insensitive match
    }

    if (status.length !== 0) {
      // Multiple statuses - use $in operator for exact matching
      filter.status = { $in: statusArray };
    }

    if (from || to) {
      const range = {};

      if (from) {
        const fromMs = Number(from);
        if (!Number.isNaN(fromMs)) {
          const fromDate = fromMs;
          range.$gte = fromDate;
        }
      }

      if (to) {
        const toMs = Number(to);
        if (!Number.isNaN(toMs)) {
          const toDate = toMs;
          range.$lte = toDate;
        }
      }

      if (Object.keys(range).length > 0) {
        filter.created_at = range;
      }

      console.log("Date range filter:", range);
    }

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

    const finalStatusForNew = status.toUpperCase() !== "RETURN" ? 'AVAILABLE' : status.toUpperCase();

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
      status: finalStatusForNew
    });

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id - update a single product
router.put('/:id', async (req, res) => {
  try {
    const { model_name, imei_number, sales_price, purchase_price, grade, engineer_name, accessories, supplier_name, qc_remark, status } = req.body;

    const existingProduct = await Product.findOne({ imei_number });
    if (existingProduct) {
      return res.status(400).json({ error: 'IMEI already exists' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const model = await Model.findOne({ name: model_name });
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    const supplier = await User.findOne({ name: supplier_name });
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    product.model = model;
    product.imei_number = imei_number;
    product.sales_price = sales_price;
    product.purchase_price = purchase_price;
    product.grade = grade;
    product.engineer_name = engineer_name;
    product.accessories = accessories;
    product.supplier = supplier;
    product.qc_remark = qc_remark;
    product.status = status;
    product.updated_at = moment().valueOf();
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id - get a single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate({ path: 'model', populate: { path: 'brand' } }).populate('supplier');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id - delete a single product      
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
