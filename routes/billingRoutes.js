const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
const User = require('../models/User');
const Product = require('../models/Product');


// GET /api/billings
router.get('/', async (req, res) => {
  try {
    const { customer_name, contact_number, status, createdAt } = req.query;

    let filter = {};

    if (customer_name) {
      const userFromDB = await User.findOne({ name: { $regex: customer_name, $options: 'i' } });
      console.log(userFromDB);
      filter.customer = userFromDB.name; // Search by customer ID
    }

    if (contact_number) {
      const userFromDB = await User.findOne({ name: { $regex: contact_number, $options: 'i' } });
      console.log(userFromDB);
      filter.contact_number = userFromDB.contact_number; // Search by customer ID
    }

    if (status) {
      filter.status = { $regex: status, $options: 'i' };
    }

    if (createdAt) {
      filter.createdAt = { $regex: createdAt, $options: 'i' };
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
    const { customer_name, contact_number, products, total_amount, payment_status, payment_method, status } = req.body;

    // Validate required fields
    if (!customer_name || !contact_number || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        error: 'Customer name, contact number, and products array are required'
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
    const productIds = [];
    const updatedProducts = [];

    for (const productId of products) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(400).json({
          error: `Product with ID ${productId} not found`
        });
      }

      if (product.status === 'sold') {
        return res.status(400).json({
          error: `Product with IMEI ${product.imei_number} is already sold`
        });
      }

      productIds.push(productId);
      updatedProducts.push(product);
    }

    // Create billing record
    const billing = new Billing({
      customer: customerId,
      products: productIds,
      total_amount,
      payment_status: payment_status || 'pending',
      createdAt: new Date().toISOString()
    });

    await billing.save();

    // Update all products status to 'sold'
    for (const product of updatedProducts) {
      product.status = 'sold';
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
      productsUpdated: productIds.length,
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
