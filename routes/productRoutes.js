const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Model = require('../models/Model');
const User = require('../models/User');
const moment = require('moment');

// Helper function to validate and find model and supplier
async function validateModelAndSupplier(model_name, supplier_name) {
  const model = await Model.findOne({ name: model_name });
  if (!model) {
    throw new Error('Model not found');
  }

  const supplier = await User.findOne({ name: supplier_name });
  if (!supplier) {
    throw new Error('Supplier not found');
  }

  return { model, supplier };
}

// Helper function to validate IMEI and handle existing products
async function validateImeiAndHandleExisting(imei_number, status) {
  const existingWithSameImei = await Product.find({ imei_number }).select('status imei_number');
  const hasAvailableExisting = existingWithSameImei.some(p => (p.status || '').toUpperCase() === 'AVAILABLE');

  if (hasAvailableExisting) {
    throw new Error('IMEI already exists with AVAILABLE status');
  }

  // If there are existing products with SOLD status, mark them as RETURN
  const soldProducts = existingWithSameImei.filter(p => (p.status || '').toUpperCase() === 'SOLD');
  if (soldProducts.length > 0) {
    await Product.updateMany(
      { _id: { $in: soldProducts.map(p => p._id) } },
      { status: 'RETURN', updated_at: moment().valueOf() }
    );
  }

  const finalStatusForNew = status.toUpperCase() !== "RETURN" ? 'AVAILABLE' : status.toUpperCase();
  return finalStatusForNew;
}

// Helper function to create a single product
async function createSingleProduct(productData) {
  const { model_name, imei_number, sales_price, purchase_price, grade, engineer_name, accessories, supplier_name, qc_remark, status } = productData;

  // Validate model and supplier
  const { model, supplier } = await validateModelAndSupplier(model_name, supplier_name);

  // Validate IMEI and handle existing products
  const finalStatus = await validateImeiAndHandleExisting(imei_number, status);

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
    status: finalStatus
  });

  await product.save();
  return product;
}

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

    if (status) {
      // Handle both single status and status array
      // If status is a string, convert to array; if already array, use as-is
      const statusArray = Array.isArray(status) ? status : [status];
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
    const product = await createSingleProduct(req.body);
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/products/bulk - Create multiple products
router.post('/bulk', async (req, res) => {
  try {
    const products = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is required and must not be empty' });
    }

    const results = {
      successful: [],
      failed: []
    };

    // Process each product
    for (let i = 0; i < products.length; i++) {
      try {
        const product = await createSingleProduct(products[i]);
        results.successful.push({
          index: i,
          product: product
        });
      } catch (err) {
        results.failed.push({
          index: i,
          productData: products[i],
          error: err.message
        });
      }
    }

    // Return results with status based on success/failure
    const statusCode = results.failed.length === 0 ? 200 :
      results.successful.length === 0 ? 400 : 207; // 207 = Multi-Status

    res.status(statusCode).json({
      message: `Processed ${products.length} products. ${results.successful.length} successful, ${results.failed.length} failed.`,
      results: results
    });

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
