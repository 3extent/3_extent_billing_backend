const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
const User = require('../models/User');
const Product = require('../models/Product');
const moment = require('moment');

// GET /api/billings
router.get('/', async (req, res) => {
  try {
    const { customer_name, contact_number, imei_number, status, from, to } = req.query;

    const filter = {};

    // Customer filter (by name or contact number)
    if (customer_name || contact_number) {
      const userQuery = {};
      if (customer_name) {
        userQuery.name = { $regex: customer_name, $options: 'i' };
      }
      if (contact_number) {
        // Note: if both provided, it uses AND logic
        userQuery.contact_number = { $regex: contact_number, $options: 'i' };
      }
      const userFromDB = await User.findOne(userQuery).select('_id');
      if (userFromDB) {
        filter.customer = userFromDB._id;
      } else {
        // No user matching, return empty result early
        return res.json([]);
      }
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    const productFromDB = await Product.findOne({ imei_number })
    console.log("productFromDB", productFromDB)
    if (imei_number) {
      filter.products = productFromDB._id;
    }
    console.log("filter", filter)


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

    console.log("filter", filter);


    // Fetch with filter
    const billings = await Billing.find(filter)
      .populate('customer')
      .populate({
        path: 'products',
        populate: {
          path: 'model',
          populate: { path: 'brand' }
        }
      })
      .sort({ created_at: -1 });

    // Compute profit for each billing and total
    // Then use reduce to compute total profit
    const totalAmount = billings.reduce(
      (sum, billing) => sum + (parseInt(billing.payable_amount) ?? 0),
      0
    );
    const totalRemaining = billings.reduce(
      (sum, billing) => sum + (parseInt(billing.pending_amount) ?? 0),
      0
    );
    const totalProfit = billings.reduce(
      (sum, billing) => sum + (parseInt(billing.profit) ?? 0),
      0
    );

    const totalProducts = billings.reduce(
      (sum, billing) => sum + (billing.products.length ?? 0),
      0
    );

    // Return both the list and total profit
    res.json({
      billings,
      totalAmount,
      totalRemaining,
      totalProfit,
      totalProducts
    });

  } catch (err) {
    console.error('Error in GET /api/billings:', err);
    res.status(500).json({ error: 'Internal server error' });
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

    // Compute profit for each billing and total
    // Then use reduce to compute total profit
    const totalSalesPrice = billing.products.reduce(
      (sum, product) => sum + (parseInt(product.sales_price) ?? 0),
      0
    );
    const totalRate = billing.products.reduce(
      (sum, product) => sum + (parseInt(product.sold_at_price) ?? 0),
      0
    );
    const totalPurchasePrice = billing.products.reduce(
      (sum, product) => sum + (parseInt(product.purchase_price) ?? 0),
      0
    );
    const totalGSTPurchasePrice = billing.products.reduce(
      (sum, product) => sum + (parseInt(product.gst_purchase_price) ?? 0),
      0
    );

    if (!billing) {
      return res.status(404).json({ error: 'Billing not found' });
    }

    // Return both the list and total profit
    res.json({
      billing,
      totalSalesPrice,
      totalRate,
      totalPurchasePrice,
      totalGSTPurchasePrice
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing
router.post('/', async (req, res) => {
  try {
    const { customer_name, contact_number, products, payable_amount, paid_amount, status } = req.body;

    // Validate required fields
    if (!products || !Array.isArray(products) || products.length === 0 || !payable_amount || !paid_amount) {
      return res.status(400).json({
        error: 'payable_amount, paid_amount and products array are required'
      });
    }

    if (status !== "DRAFTED") {
      if (!customer_name || !contact_number) {
        return res.status(400).json({
          error: 'customer_name and contact_number are required'
        });
      }
    }
    // Check if customer already exists based on contact number
    let existingCustomer = await User.findOne({ contact_number: contact_number });


    let customerId;
    if (existingCustomer) {
      // Customer exists, use existing customer ID
      customerId = existingCustomer._id;
      console.log(`Using existing customer: ${existingCustomer.name} (${existingCustomer.contact_number})`);
    } else if (!existingCustomer && status !== "DRAFTED") {
      return res.status(400).json({
        error: `Customer not found`
      });
    }

    // Validate products and update their status to 'sold'
    const foundProducts = [];
    const updatedProducts = [];

    for (const singleProduct of products) {
      // Find product by IMEI, but prefer AVAILABLE status to avoid finding SOLD/REMOVED products
      // If multiple exist, this ensures we get the correct one
      let product = await Product.findOne({
        imei_number: singleProduct.imei_number,
        status: { $in: ['AVAILABLE', 'RETURN'] } // Only find available products
      });

      // If not found with AVAILABLE status, check if it exists with other status
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

      foundProducts.push({ productId: product._id, final_rate: singleProduct.rate, purchase_price: product.purchase_price });
      updatedProducts.push(product);
    }

    const pending_amount = payable_amount - paid_amount.reduce((sum, payment) => sum + payment.amount, 0);
    const totalCost = foundProducts.reduce((sum, product) => sum + parseFloat(product.final_rate), 0);
    const totalGSTPurchasePrice = foundProducts.reduce((sum, product) => sum + parseFloat(product.gst_purchase_price), 0);
    const profit = totalCost - totalGSTPurchasePrice;

    let billStatus = status;
    if (pending_amount > 0 && billStatus !== "DRAFTED") {
      if (pending_amount !== payable_amount) {
        billStatus = "PARTIALLY_PAID"
      } else {
        billStatus = "UNPAID"
      }
    } else if (pending_amount === 0) {
      billStatus = "PAID"
    }

    // Create billing record
    const billing = new Billing({
      customer: customerId,
      products: foundProducts.map((singleProduct) => singleProduct.productId),
      payable_amount,
      pending_amount: pending_amount,
      paid_amount,
      status: billStatus,
      profit: profit.toString(),
      created_at: moment.utc().valueOf(),
      update_at: moment.utc().valueOf()
    });

    await billing.save();

    // Update all products status to 'SOLD', if billing status is not DRAFTED
    // Keep all products status to 'AVAILABLE'/ 'RETURN', if billing status is DRAFTED


    for (const product of updatedProducts) {
      if (billStatus !== "DRAFTED") {
        product.status = 'SOLD';
      }
      // Find the corresponding final_rate from foundProducts
      const foundProduct = foundProducts.find(fp => fp.productId.toString() === product._id.toString());
      if (foundProduct) {
        product.sold_at_price = foundProduct.final_rate;
        product.updated_at = moment.utc().valueOf();
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


// PUT /api/billing
router.put('/:id', async (req, res) => {
  try {
    const { customer_name, contact_number, products, payable_amount, paid_amount, status } = req.body;

    // Validate required fields
    if (!customer_name || !contact_number || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        error: 'Customer name, contact number and products array are required'
      });
    }

    const bill = await Billing.findById(req.params.id)
    console.log(bill);
    // console.log(paid_amount);
    // Check if customer already exists based on contact number
    let existingCustomer = await User.findOne({ contact_number: contact_number });


    let customerId;
    if (existingCustomer) {
      // Customer exists, use existing customer ID
      customerId = existingCustomer._id;
      console.log(`Using existing customer: ${existingCustomer.name} (${existingCustomer.contact_number})`);
    } else {
      return res.status(400).json({
        error: `Customer not found`
      });
    }

    // Validate products and update their status to 'sold'
    const foundProducts = [];
    const updatedProducts = [];

    for (const singleProduct of products) {
      // Find product by IMEI, but prefer AVAILABLE status to avoid finding SOLD/REMOVED products
      // If multiple exist, this ensures we get the correct one
      let product = await Product.findOne({
        imei_number: singleProduct.imei_number,
        status: { $in: ['AVAILABLE', 'RETURN'] } // Only find available products
      });

      // If not found with AVAILABLE status, check if it exists with other status
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

      foundProducts.push({ productId: product._id, final_rate: singleProduct.rate, purchase_price: product.purchase_price, gst_purchase_price: singleProduct.gst_purchase_price });
      updatedProducts.push(product);
    }

    const pending_amount = payable_amount - paid_amount.reduce((sum, payment) => sum + payment.amount, 0);

    const totalCost = foundProducts.reduce((sum, product) => sum + parseFloat(product.final_rate), 0);
    const totalGSTPurchasePrice = foundProducts.reduce((sum, product) => sum + parseFloat(product.gst_purchase_price), 0);
    const profit = totalCost - totalGSTPurchasePrice;

    const billing = await Billing.findByIdAndUpdate(req.params.id, {
      customer: customerId,
      products: foundProducts.map((singleProduct) => singleProduct.productId),
      payable_amount,
      pending_amount: pending_amount,
      paid_amount,
      status,
      profit: profit.toString(),
      update_at: moment.utc().valueOf()
    }, { new: true });


    for (const product of updatedProducts) {
      if (status !== "DRAFTED") {

        product.status = 'SOLD';
      }
      // Find the corresponding final_rate from foundProducts
      const foundProduct = foundProducts.find(fp => fp.productId.toString() === product._id.toString());
      if (foundProduct) {
        product.sold_at_price = foundProduct.final_rate;
        product.updated_at = moment.utc().valueOf();
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

// PUT /api/billing/payment
router.put('/payment/:id', async (req, res) => {
  try {
    const { payable_amount, paid_amount } = req.body;

    // Validate required fields
    if (!payable_amount || !paid_amount) {
      return res.status(400).json({
        error: 'payable_amount, paid_amount are required'
      });
    }

    const bill = await Billing.findById(req.params.id).populate('customer')
      .populate({
        path: 'products',
        populate: {
          path: 'model',
          populate: { path: 'brand' }
        }
      })
    console.log(bill);
    console.log(paid_amount);



    const pending_amount = bill.pending_amount - paid_amount.reduce((sum, payment) => sum + payment.amount, 0);

    let billStatus = bill.status;


    // Validate products and update their status to 'sold'
    const foundProducts = [];
    const updatedProducts = [];

    console.log("bill", bill)

    if (billStatus === "DRAFTED") {
      for (const singleProduct of bill.products) {
        // Find product by IMEI, but prefer AVAILABLE status to avoid finding SOLD/REMOVED products
        // If multiple exist, this ensures we get the correct one
        let product = await Product.findOne({
          imei_number: singleProduct.imei_number,
          status: { $in: ['AVAILABLE', 'RETURN'] } // Only find available products
        });

        // If not found with AVAILABLE status, check if it exists with other status
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

        foundProducts.push({ productId: product._id, final_rate: singleProduct.sold_at_price, purchase_price: product.purchase_price });
        updatedProducts.push(product);
      }
    }

    if (pending_amount > 0) {
      if (pending_amount !== bill.payable_amount) {
        billStatus = "PARTIALLY_PAID"
      } else {
        billStatus = "UNPAID"
      }
    } else {
      billStatus = "PAID"
    }

    for (const product of updatedProducts) {
      product.status = 'SOLD';

      // Find the corresponding final_rate from foundProducts
      const foundProduct = foundProducts.find(fp => fp.productId.toString() === product._id.toString());
      console.log("foundProduct", foundProduct);

      if (foundProduct) {
        product.sold_at_price = foundProduct.final_rate;
        product.updated_at = moment.utc().valueOf();
      }

      await product.save();
    }


    const billing = await Billing.findByIdAndUpdate(req.params.id, {
      pending_amount: pending_amount,
      paid_amount,
      status: billStatus,
      update_at: moment.utc().valueOf()
    }, { new: true });


    res.json(billing);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
