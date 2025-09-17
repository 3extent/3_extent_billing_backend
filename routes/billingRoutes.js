const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
const User = require('../models/User');
const Product = require('../models/Product');

// GET /api/billings
router.get('/', async (req, res) => {
  try {
    const { customer_name, contact_number, status, from, to } = req.query;

    let filter = {};

    if (customer_name) {
      const userFromDB = await User.findOne({ name: { $regex: customer_name, $options: 'i' } });
      console.log(userFromDB);
      if (userFromDB) {
        filter.customer = userFromDB._id; // Search by customer ID
      } else {
        // No matching customer; ensure no results
        filter.customer = null;
      }
    }

    if (contact_number) {
      const userFromDB = await User.findOne({ contact_number: { $regex: contact_number, $options: 'i' } });
      console.log(userFromDB);
      if (userFromDB) {
        filter.customer = userFromDB._id; // Search by customer ID
      } else {
        filter.customer = null;
      }
    }

    if (status) {
      filter.status = { $regex: status, $options: 'i' };
    }

    // Date range filtering (from/to in milliseconds)
    if (from || to) {
      const range = {};
      if (from && !Number.isNaN(Number(from))) {
        range.$gte = new Date(Number(from)).toISOString();
      }
      if (to && !Number.isNaN(Number(to))) {
        range.$lte = new Date(Number(to)).toISOString();
      }
      if (Object.keys(range).length > 0) {
        filter.createdAt = range;
      }
    }

    const billings = await Billing.find(filter)
      .populate('customer')
      .populate({
        path: 'products',
        populate: {
          path: 'model',
          populate: { path: 'brand' }
        }
      })
      .sort({ createdAt: -1 }); // Sort by newest first

    res.json(billings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/billings/:id
router.get('/:id', async (req, res) => {
  try {
    const billing = await Billing.findById(req.params.id)
      .populate('customer')
      .populate({
        path: 'products',
        populate: {
          path: 'model',
          populate: { path: 'brand' }
        }
      });

    if (!billing) {
      return res.status(404).json({ error: 'Billing not found' });
    }

    res.json(billing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing
router.post('/', async (req, res) => {
  try {
    const { customer_name, contact_number, products, payable_amount, paid_amount, status } = req.body;

    // Validate required fields
    if (!customer_name || !contact_number || !products || !Array.isArray(products) || products.length === 0 || !payable_amount || !paid_amount) {
      return res.status(400).json({
        error: 'Customer name, contact number, payable_amount, paid_amount and products array are required'
      });
    }

    // Check if customer already exists based on contact number
    let existingCustomer = await User.findOne({ contact_number: contact_number });

    let customerId;
    if (existingCustomer) {
      // Customer exists, use existing customer ID
      customerId = existingCustomer._id;
      console.log(`Using existing customer: ${existingCustomer.name} (${existingCustomer.contact_number})`);
    } else {
      // Create new customer
      const newCustomer = new User({
        name: customer_name,
        contact_number: contact_number,
        role: 'customer',
        createdAt: new Date().toISOString()
      });

      await newCustomer.save();
      customerId = newCustomer._id;
      console.log(`Created new customer: ${newCustomer.name} (${newCustomer.contact_number})`);
    }

    // Validate products and update their status to 'sold'
    const foundProducts = [];
    const updatedProducts = [];

    for (const singleProduct of products) {
      const product = await Product.findOne({ imei_number: singleProduct.imei_number });
      if (!product) {
        return res.status(400).json({
          error: `Product with IMEI ${singleProduct.imei_number} not found`
        });
      }

      if (product.status === 'SOLD') {
        return res.status(400).json({
          error: `Product with IMEI ${product.imei_number} is already sold`
        });
      }

      foundProducts.push({ productId: product._id, final_rate: singleProduct.rate });
      updatedProducts.push(product);
    }

    const pending_amount = payable_amount - paid_amount.reduce((sum, payment) => sum + payment.amount, 0);


    let billStatus = status;
    if (pending_amount > 0) {
      if (pending_amount !== payable_amount) {
        billStatus = "PARTIALLY_PAID"
      } else {
        billStatus = "UNPAID"
      }
    } else {
      billStatus = "PAID"
    }


    // Create billing record
    const billing = new Billing({
      customer: customerId,
      products: foundProducts.map((singleProduct) => singleProduct.productId),
      payable_amount,
      pending_amount: payable_amount - paid_amount.reduce((sum, payment) => sum + payment.amount, 0),
      paid_amount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: billStatus
    });

    await billing.save();

    // Update all products status to 'sold'
    // Update all products status to 'sold'
    for (const product of updatedProducts) {
      product.status = 'SOLD';

      // Find the corresponding final_rate from foundProducts
      const foundProduct = foundProducts.find(fp => fp.productId.toString() === product._id.toString());
      if (foundProduct) {
        product.final_rate = foundProduct.final_rate;
      }

      await product.save();
    }

    // Populate the billing record with customer and product details
    const populatedBilling = await Billing.findById(billing._id)
      .populate('customer')
      .populate({
        path: 'products',
        populate: {
          path: 'model',
          populate: { path: 'brand' }
        }
      });

    res.json({
      message: 'Billing created successfully and products marked as sold',
      billing: populatedBilling,
      productsUpdated: updatedProducts.length,
      customerInfo: {
        id: customerId,
        name: customer_name,
        contact_number: contact_number,
        isNewCustomer: !existingCustomer
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
