const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Model = require('../models/Model');
const User = require('../models/User');
const moment = require('moment');

// Helper function to validate and find model and supplier
async function validateModelAndSupplier(model_name, supplier_name, brand) {
  let model = await Model.findOne({ name: model_name, brand: brand._id });

  if (!model) {
    // Create model if it doesn't exist
    model = new Model({
      name: model_name,
      brand: brand._id,
      created_at: moment.utc().valueOf(),
      updated_at: moment.utc().valueOf()
    });
    await model.save();
  }

  const supplier = await User.findOne({ name: supplier_name, role: "SUPPLIER" });
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

  const finalStatusForNew = status && status.toUpperCase() === "RETURN" ? status.toUpperCase() : 'AVAILABLE';
  return finalStatusForNew;
}

// Helper function to create a single product
async function createSingleProduct(productData) {
  const { brand_name, model_name, imei_number, sales_price, purchase_price, grade, engineer_name, accessories, supplier_name, qc_remark, status } = productData;

  //validate brand
  let brand = await Brand.findOne({ name: brand_name });

  if (!brand) {
    // Create model if it doesn't exist
    brand = new Brand({
      name: brand_name,
      created_at: moment.utc().valueOf(),
      updated_at: moment.utc().valueOf()
    });
    await brand.save();
  }

  // Validate model and supplier and add model if not there
  const { model, supplier } = await validateModelAndSupplier(model_name, supplier_name, brand);

  // Validate IMEI and handle existing products
  const finalStatus = await validateImeiAndHandleExisting(imei_number, status);

  // Create new product
  const product = new Product({
    brand,
    model,
    imei_number,
    sales_price,
    purchase_price,
    gst_purchase_price: parseInt(purchase_price) + 500,
    grade,
    engineer_name,
    accessories,
    supplier,
    qc_remark,
    status: finalStatus
  });


  return product;
}

// GET /api/products
router.get('/', async (req, res) => {
  try {
    console.log(req.query);
    const { imei_number, grade, brandName, modelName, status, supplierName, from, to } = req.query;
    let filter = {};

    if (imei_number) {
      filter.imei_number = { $regex: imei_number, $options: 'i' }; // partial, case-insensitive match
    }

    if (grade) {
      filter.grade = { $regex: grade, $options: 'i' }; // partial, case-insensitive match
    }

    if (status) {
      const statusArray = status.split(",");
      // Always exclude REMOVED regardless of status filter
      filter.status = { $in: statusArray.filter(s => s !== "REMOVED"), $ne: "REMOVED" };
    } else {
      // If no status filter specified, still exclude REMOVED
      filter.status = { $ne: "REMOVED" };
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

    if (supplierName) {
      const supplierFromDb = await User.findOne({ name: { $regex: supplierName, $options: 'i' }, role: "SUPPLIER" })
      if (!supplierFromDb) {
        filter.supplier = null
      } else {
        filter.supplier = supplierFromDb._id
      }
    }

    console.log(filter);

    const products = await Product.find(filter).populate({ path: 'model', populate: { path: 'brand' } }).populate('supplier').populate('repair_by').sort({ created_at: -1 });;
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/ - Create single product
router.post('/', async (req, res) => {
  try {
    const product = await createSingleProduct(req.body);
    await product.save();
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

    const seen = new Set();
    const uniqueProducts = [];

    for (let i = 0; i < products.length; i++) {
      const imei = products[i].imei_number;
      if (seen.has(imei)) {
        // Duplicate IMEI in input — skip or reject
        return res.status(400).json({
          error: `Duplicate imei_number '${imei}' found in input at index ${i}`
        });
      }
      seen.add(imei);
      uniqueProducts.push(products[i]);
    }

    // Now uniqueProducts contains only first occurrence of each IMEI
    const prepared = [];
    for (let i = 0; i < uniqueProducts.length; i++) {
      const doc = await createSingleProduct(uniqueProducts[i], { save: false });
      prepared.push(doc);
    }

    const result = await Product.insertMany(prepared, { ordered: false });
    res.status(200).json({ message: `Inserted ${result.length} products.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// PUT /api/products/:id - update a single product
router.put('/:id', async (req, res) => {
  try {
    const { model_name, imei_number, sales_price, purchase_price, grade, engineer_name, accessories, supplier_name, qc_remark, status } = req.body;

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
    product.updated_at = moment.utc().valueOf();
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id - get a single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate({ path: 'model', populate: { path: 'brand' } }).populate('supplier').populate('repair_by');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id - change status of product to REMOVED instead of deleting
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if ((product.status || '').toUpperCase() === 'SOLD') {
      return res.status(400).json({ error: 'Cannot remove a product that has been SOLD' });
    }
    product.status = 'REMOVED';
    product.updated_at = moment.utc().valueOf();
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id/repair - update repair details
router.put('/:id/repair', async (req, res) => {
  try {
    const { issue, repair_cost, repair_remark, repairer_name, repairer_contact_number, status } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const repairer = await User.findOne({ contact_number: repairer_contact_number });
    if (!repairer) {
      return res.status(404).json({ error: 'Repairer not found' });
    }
    product.issue = issue;
    if (status === 'IN_REPAIRING') {
      product.status = status;
      product.repair_started_at = moment.utc().valueOf();
    } else if (status === 'REPAIRED') {
      product.status = "AVAILABLE";
      product.is_repaired = true;
      product.sales_price = parseInt(product.sales_price) + parseInt(repair_cost);
      product.repair_cost = repair_cost;
      product.repair_remark = repair_remark;
      product.repair_completed_at = moment.utc().valueOf();
    }
    
    product.repair_by = repairer._id;
    product.updated_at = moment.utc().valueOf();
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
