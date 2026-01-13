const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Model = require('../models/Model');
const User = require('../models/User');
const Role = require('../models/UserRole');
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

  const supplier_role = await Role.findOne({ name: "SUPPLIER" });

  const supplier = await User.findOne({ name: supplier_name, role: supplier_role._id });
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
    const { imei_number,
      grade,
      brandName,
      modelName,
      status,
      supplierName,
      from,
      to,
      is_repaired,
      repair_from,
      repair_to } = req.query;
    let filter = {};

    if (imei_number) {
      filter.imei_number = { $regex: imei_number, $options: 'i' }; // partial, case-insensitive match
    }

    if (grade) {
      filter.grade = { $regex: grade, $options: 'i' }; // partial, case-insensitive match
    }

    if (is_repaired) {
      filter.is_repaired = is_repaired; // partial, case-insensitive match
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
    if (repair_from || repair_to) {
      const repair_range = {};

      if (repair_from) {
        const repairFromMS = Number(repair_from);
        if (!Number.isNaN(repairFromMS)) {
          const repairFrom = repairFromMS;
          repair_range.$gte = repairFrom;
        }
      }

      if (repair_to) {
        const repairToMS = Number(repair_to);
        if (!Number.isNaN(repairToMS)) {
          const repairTo = repairToMS;
          repair_range.$lte = repairTo;
        }
      }

      if (Object.keys(repair_range).length > 0) {
        if (!status) {
          filter.repair_started_at = repair_range;
        } else if (status.split(',').includes("IN_REPAIRING")) {
          filter.repair_started_at = repair_range;
        } else if (status.split(',').includes("AVAILABLE") && is_repaired) {
          filter.repair_completed_at = repair_range;
        }
      }

      console.log("Repair Date range filter:", repair_range);
    }

    console.log("filter:", filter);

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
      const supplier_role = await Role.findOne({ name: "SUPPLIER" });

      const supplierFromDb = await User.findOne({ name: { $regex: supplierName, $options: 'i' }, role: supplier_role._id })
      if (!supplierFromDb) {
        filter.supplier = null
      } else {
        filter.supplier = supplierFromDb._id
      }
    }

    console.log(filter);

    const products = await Product.find(filter).populate({ path: 'model', populate: { path: 'brand' } }).populate('supplier').populate('repair_by').sort({ created_at: -1 });;
    let part_cost_of_all_products = products.reduce((sum, product) => sum + (parseInt(product.part_cost) || 0), 0);
    let repairer_cost_of_all_products = products.reduce((sum, product) => sum + (parseInt(product.repairer_cost) || 0), 0);
    let purchase_total_of_all_products = products.reduce((sum, product) => sum + (parseInt(product.purchase_price) || 0), 0);

    res.json({
      products,
      part_cost_of_all_products,
      repairer_cost_of_all_products,
      purchase_total_of_all_products
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/ - Create single product
router.post('/', async (req, res) => {
  try {
    const product = await createSingleProduct(req.body);
    await product.save();
    console.log('product: ', product)
    const supplier = await User.findById(product.supplier._id);
    console.log('supplier: ', supplier)

    supplier.payable_amount = (parseInt(supplier.payable_amount) || 0) + parseInt(product.purchase_price);
    supplier.pending_amount = supplier.payable_amount - (parseInt(supplier.pending_amount) || 0)
    supplier.products.push(product._id)
    console.log('supplier: ', supplier)
    await supplier.save();
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

    console.log('result: ', result)
    for (singleProduct of result) {
      const supplier = await User.findById(singleProduct.supplier._id);
      console.log('supplier: ', supplier)

      supplier.payable_amount = (parseInt(supplier.payable_amount) || 0) + parseInt(singleProduct.purchase_price);
      supplier.pending_amount = supplier.payable_amount - (parseInt(supplier.pending_amount) || 0)
      supplier.products.push(singleProduct._id)
      console.log('supplier: ', supplier)
      await supplier.save();
    }
    res.status(200).json({
      message: `Successfully inserted ${result.length} products.`,
      products: result
    });
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
    const {
      issue,
      imei_number,
      grade,
      repairer_cost = 0,
      repair_remark,
      repairer_contact_number,
      status,
      qc_remark,
      accessories = [],
      repair_parts = []
    } = req.body;

    const product = await Product
      .findById(req.params.id)
      .populate('model')
      .populate('repair_by');

    let totalCost = 0;

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    /* ---------------- IMEI CHECK (FIXED) ---------------- */
    if (imei_number && product.imei_number !== imei_number) {
      const productFromDB = await Product.findOne({
        imei_number,
        _id: { $ne: product._id }
      });

      if (productFromDB) {
        return res.status(400).json({ error: 'IMEI_NUMBER already exists in the system' });
      }
    }

    /* ---------------- FIND REPAIRER ---------------- */
    let repairer;
    if (status === "IN_REPAIRING") {
      repairer = await User.findOne({ contact_number: repairer_contact_number });
    } else if (status === "REPAIRED") {
      repairer = product.repair_by;
    }

    if (!repairer) {
      return res.status(404).json({ error: 'Repairer not found' });
    }

    /* ---------------- SHOP VALIDATION ---------------- */
    let rebuiltRepairParts = [];

    if (repair_parts.length) {
      const shopNames = [...new Set(
        repair_parts.map(p => p.shop_name?.trim()).filter(Boolean)
      )];

      const shops = await User.find({
        name: { $in: shopNames }
      }).select('_id name');

      if (shops.length !== shopNames.length) {
        const foundNames = shops.map(s => s.name);
        const missingShops = shopNames.filter(
          name => !foundNames.includes(name)
        );

        return res.status(400).json({
          error: 'Some shop names do not exist',
          missingShops
        });
      }

      const shopMap = {};
      shops.forEach(shop => {
        shopMap[shop.name] = shop._id;
      });

      rebuiltRepairParts = repair_parts.map(part => {
        const cost = Number(part.cost) || 0;
        totalCost += cost;

        return {
          shop: shopMap[part.shop_name.trim()],
          part_name: part.part_name,
          cost
        };
      });
    }

    /* ---------------- UPDATE PRODUCT ---------------- */
    product.issue = issue;

    if (status === 'IN_REPAIRING') {
      product.status = status;
      product.accessories = accessories;
      product.repair_by = repairer._id;
      product.repair_started_at = moment.utc().valueOf();
    }

    if (status === 'REPAIRED') {
      product.imei_number = imei_number;
      product.grade = grade;
      product.status = "AVAILABLE";
      product.is_repaired = true;
      product.repairer_cost = Number(repairer_cost);
      product.repair_remark = repair_remark;
      product.qc_remark = qc_remark;
      product.repair_parts = rebuiltRepairParts;
      product.repair_completed_at = moment.utc().valueOf();

      product.sales_price =
        (Number(product.sales_price) || 0) +
        Number(repairer_cost) +
        totalCost;

      product.purchase_cost_including_expenses =
        (Number(product.purchase_cost_including_expenses) || Number(product.purchase_price)) +
        Number(repairer_cost) +
        totalCost;
    }

    product.updated_at = moment.utc().valueOf();
    await product.save();

    /* ---------------- UPDATE REPAIRER ---------------- */
    repairer.products = repairer.products || [];

    if (!repairer.products.includes(product._id)) {
      repairer.products.push(product._id);
    }

    if (status === "REPAIRED") {
      repairer.total_part_cost = totalCost;

      repairer.payable_amount =
        (Number(repairer.payable_amount) || 0) +
        Number(repairer_cost);

      repairer.pending_amount =
        (Number(repairer.payable_amount) || 0) -
        (Number(repairer.paid_amount) || 0);
    }

    repairer.updated_at = moment.utc().valueOf();
    await repairer.save();

    // ✅ Update shops with repair activities (SAFE)
    for (const singleEle of rebuiltRepairParts) {
      await User.findByIdAndUpdate(
        singleEle.shop,
        {
          $push: {
            repair_activities: {
              product: product._id,
              part_name: singleEle.part_name,
              cost: singleEle.cost,
              repairer: repairer._id,
              created_at: moment.utc().valueOf()
            }
          },
          $inc: {
            total_part_sales: singleEle.cost
          }
        }
      );
    }

    res.json(product);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
