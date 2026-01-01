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


    // If user explicitly passes status param — override (or include) as needed
    if (status) {
      filter.status = status;
    } else {
      // By default exclude DRAFTED and REMOVED_DRAFTED
      filter.status = { $nin: ['DRAFTED', 'REMOVED_DRAFTED', 'REMOVED_CHECKOUT'] };

    }

    // Customer filter
    if (customer_name || contact_number) {
      const userQuery = {};
      if (customer_name) {
        userQuery.name = { $regex: customer_name, $options: 'i' };
      }
      if (contact_number) {
        userQuery.contact_number = { $regex: contact_number, $options: 'i' };
      }
      const userFromDB = await User.findOne(userQuery).select('_id');
      if (!userFromDB) {
        return res.json({ billings: [], totalAmount: 0, totalRemaining: 0, totalProfit: 0, totalProducts: 0 });
      }
      filter.customer = userFromDB._id;
    }

    // IMEI / product filter
    if (imei_number) {
      const productFromDB = await Product.findOne({ imei_number });
      if (!productFromDB) {
        return res.json({ billings: [], totalAmount: 0, totalRemaining: 0, totalProfit: 0, totalProducts: 0 });
      }
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
    }

    const billings = await Billing.find(filter)
      .populate('customer')
      .populate({
        path: 'products',
        populate: { path: 'model', populate: { path: 'brand' } }
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
      (sum, billing) => sum + (parseInt(billing.actualProfit) ?? 0),
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
        populate: [
          {
            path: 'model',
            populate: { path: 'brand' }
          },
          {
            path: 'supplier'
          }
        ]
      })


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

    // const netTotal = totalRate + (billing.profit * 0.18)

    if (!billing) {
      return res.status(404).json({ error: 'Billing not found' });
    }

    // Return both the list and total profit
    res.json({
      billing,
      totalSalesPrice,
      totalRate,
      totalPurchasePrice,
      totalGSTPurchasePrice,
      // netTotal
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
      console.log("singleProduct", singleProduct);

      foundProducts.push({ productId: product._id, final_rate: singleProduct.rate, purchase_price: product.purchase_price, gst_purchase_price: product.gst_purchase_price || product.purchase_price });

      updatedProducts.push(product);
    }

    const pending_amount = payable_amount - paid_amount.reduce((sum, payment) => sum + payment.amount, 0);
    const totalCost = foundProducts.reduce((sum, product) => sum + parseFloat(product.final_rate), 0);
    console.log("foundProducts", foundProducts);


    const totalGSTPurchasePrice = foundProducts.reduce((sum, product) => sum + parseFloat(product.gst_purchase_price), 0);
    const totalPurchasePrice = foundProducts.reduce((sum, product) => sum + parseFloat(product.purchase_price), 0);
    console.log("totalGSTPurchasePrice", totalGSTPurchasePrice);

    const profitToShow = totalCost - totalGSTPurchasePrice;
    const actualProfit = totalCost - totalPurchasePrice;

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

    let c_gst = 0;
    let s_gst = 0;

    let net_total = payable_amount;
    if (profitToShow > 0) {
      c_gst = profitToShow * 0.09;
      s_gst = profitToShow * 0.09;
      net_total = payable_amount + c_gst + s_gst;
    }

    // Create billing record
    const billing = new Billing({
      customer: customerId,
      products: foundProducts.map((singleProduct) => singleProduct.productId),
      payable_amount,
      pending_amount: pending_amount,
      paid_amount,
      status: billStatus,
      profitToShow: profitToShow.toString(),
      actualProfit: actualProfit.toString(),
      net_total,
      c_gst: c_gst.toString(),
      s_gst: s_gst.toString(),
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

// PUT /api/billing/:id
router.put('/:id', async (req, res) => {
  try {
    const { customer_name, contact_number, products, payable_amount, paid_amount = [], advance_amount, status } = req.body;

    if (!customer_name || !contact_number || !products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Customer name, contact number and products array are required' });
    }

    // Load bill
    const bill = await Billing.findById(req.params.id).lean();
    if (!bill) {
      return res.status(404).json({ error: 'Billing record not found' });
    }

    // Find customer
    const existingCustomer = await User.findOne({ contact_number });
    if (!existingCustomer) {
      return res.status(400).json({ error: 'Customer not found' });
    }
    const customerId = existingCustomer._id;

    // Old products
    const oldProductIds = bill.products.map(id => id.toString());
    const incomingImeis = products.map(p => p.imei_number);

    const incomingRateMap = {};
    for (const p of products) incomingRateMap[p.imei_number] = p.rate;

    // Fetch old products
    const oldProducts = await Product.find({ _id: { $in: oldProductIds } });
    const oldImeis = oldProducts.map(p => p.imei_number);

    const oldByImei = {};
    for (const p of oldProducts) oldByImei[p.imei_number] = p;

    // Determine changes
    const removedImeis = oldImeis.filter(i => !incomingImeis.includes(i));
    const removedProductDocs = oldProducts.filter(p => removedImeis.includes(p.imei_number));

    const keptImeis = oldImeis.filter(i => incomingImeis.includes(i));
    const newAddedImeis = incomingImeis.filter(i => !oldImeis.includes(i));

    // -------- HANDLE REMOVALS --------
    if (removedProductDocs.length > 0) {
      // Check for other SOLD products with same IMEI
      const otherSold = await Product.find({
        imei_number: { $in: removedImeis },
        status: 'SOLD',
        _id: { $nin: removedProductDocs.map(p => p._id) }
      });

      const soldOtherSet = new Set(otherSold.map(p => p.imei_number));

      for (const p of removedProductDocs) {
        if (soldOtherSet.has(p.imei_number)) {
          p.status = 'RETURN';
        } else {
          p.status = 'AVAILABLE';
        }
        p.sold_at_price = undefined;
        p.updated_at = moment.utc().valueOf();
        await p.save();
      }
    }


    // -------- VALIDATE NEWLY ADDED PRODUCTS --------
    let newlyAddedProducts = [];
    if (newAddedImeis.length > 0) {
      newlyAddedProducts = await Product.find({
        imei_number: { $in: newAddedImeis },
        status: { $in: ['AVAILABLE', 'RETURN'] }
      });

      const foundNewImeis = newlyAddedProducts.map(p => p.imei_number);
      const missing = newAddedImeis.filter(i => !foundNewImeis.includes(i));

      if (missing.length > 0) {
        return res.status(400).json({ error: `Products not found or not available: ${missing.join(', ')}` });
      }
    }


    // -------- BUILD NEW BILL PRODUCT LIST --------
    const foundProducts = [];
    const updatedProducts = [];

    // Kept items
    for (const imei of keptImeis) {
      const p = oldByImei[imei];
      const finalRate = incomingRateMap[imei];

      foundProducts.push({
        productId: p._id,
        final_rate: finalRate,
        purchase_price: p.purchase_price,
        gst_purchase_price: p.gst_purchase_price || p.purchase_price
      });

      updatedProducts.push(p);
    }

    // Newly added
    for (const p of newlyAddedProducts) {
      const finalRate = incomingRateMap[p.imei_number];

      foundProducts.push({
        productId: p._id,
        final_rate: finalRate,
        purchase_price: p.purchase_price,
        gst_purchase_price: p.gst_purchase_price || p.purchase_price
      });

      updatedProducts.push(p);
    }


    // -------- CALCULATE PAYMENTS & PROFITS --------
    const numericPaidArray = Array.isArray(paid_amount) ? paid_amount : [];
    const totalPaid = numericPaidArray.reduce((s, pay) => s + (parseFloat(pay.amount) || 0), 0);
    const pending_amount = (parseFloat(payable_amount) || 0) - totalPaid;

    const totalCost = foundProducts.reduce((s, fp) => s + (parseFloat(fp.final_rate) || 0), 0);
    const totalGSTPurchasePrice = foundProducts.reduce((s, fp) => s + (parseFloat(fp.gst_purchase_price) || 0), 0);
    const totalPurchasePrice = foundProducts.reduce((s, fp) => s + (parseFloat(fp.purchase_price) || 0), 0);

    const profitToShow = totalCost - totalGSTPurchasePrice;
    const actualProfit = totalCost - totalPurchasePrice;

    let c_gst = 0;
    let s_gst = 0;
    let net_total = parseFloat(payable_amount) || 0;

    if (profitToShow > 0) {
      c_gst = profitToShow * 0.09;
      s_gst = profitToShow * 0.09;
      net_total = net_total + c_gst + s_gst;
    }


    // -------- UPDATE BILL --------
    const billUpdate = {
      customer: customerId,
      products: foundProducts.map(fp => fp.productId),
      payable_amount,
      pending_amount,
      paid_amount: numericPaidArray,
      advance_amount,
      status,
      actualProfit: actualProfit.toString(),
      profitToShow: profitToShow.toString(),
      net_total,
      c_gst: c_gst.toString(),
      s_gst: s_gst.toString(),
      updated_at: moment.utc().valueOf()
    };

    const savedBill = await Billing.findByIdAndUpdate(req.params.id, billUpdate, { new: true });


    // -------- UPDATE PRODUCTS (kept + newly added) --------
    for (const product of updatedProducts) {
      if (status !== 'DRAFTED') {
        product.status = 'SOLD';
      }

      const fp = foundProducts.find(f => f.productId.toString() === product._id.toString());
      if (fp) {
        product.sold_at_price = fp.final_rate;
      }

      product.updated_at = moment.utc().valueOf();
      await product.save();
    }

    // ------- UPDATE CUSTOMER WITH ADVANCE AMOUNT-------------

    const total_advance_amount = Number(existingCustomer.advance_amount) || 0 + Number(advance_amount);
    await User.findByIdAndUpdate(existingCustomer._id, {
      advance_amount: total_advance_amount.toString(),
      updated_at: moment.utc().valueOf()
    },
      { new: true }
    );

    // -------- RETURN POPULATED BILL --------
    const populatedBilling = await Billing.findById(savedBill._id)
      .populate('customer')
      .populate({
        path: 'products',
        populate: { path: 'model', populate: { path: 'brand' } }
      });

    return res.json({
      message: 'Billing updated successfully',
      billing: populatedBilling,
      productsUpdated: updatedProducts.length,
      customerInfo: {
        id: customerId,
        name: customer_name,
        contact_number,
        isNewCustomer: false
      }
    });


  } catch (err) {
    console.error('Error updating billing:', err);
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/billing/payment/:id
router.put('/payment/:id', async (req, res) => {
  try {
    const { paid_amount } = req.body;

    /* ---------------------------------------------------
       0️⃣ VALIDATION
    --------------------------------------------------- */
    if (!Array.isArray(paid_amount) || paid_amount.length === 0) {
      return res.status(400).json({
        error: 'paid_amount must be a non-empty array'
      });
    }

    /* ---------------------------------------------------
       1️⃣ FETCH BILL
    --------------------------------------------------- */
    const bill = await Billing.findById(req.params.id)
      .populate('customer')
      .populate({
        path: 'products',
        populate: {
          path: 'model',
          populate: { path: 'brand' }
        }
      });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }



    /* ---------------------------------------------------
       2️⃣ MERGE EXISTING + NEW PAYMENTS
    --------------------------------------------------- */
    const paidMap = {};

    // Existing payments from DB
    bill.paid_amount.forEach(p => {
      paidMap[p.method] = Number(p.amount);
    });

    // Incoming payments
    for (const payment of paid_amount) {
      if (!payment.method || payment.amount == null) {
        return res.status(400).json({
          error: 'Each payment must have method and amount'
        });
      }

      const amt = Number(payment.amount);

      paidMap[payment.method] =
        (paidMap[payment.method] || 0) + amt;
    }

    const updatedPaidAmount = Object.keys(paidMap).map(method => ({
      method,
      amount: paidMap[method].toString()
    }));

    const advancePayment = paid_amount
      .filter(p => p.method === 'advance_amount')
      .reduce((total, p) => total + Number(p.amount), 0);

    if (advancePayment > 0) {
      // If the customer has an advance_amount field
      const updated_advance_amount = Number(bill.customer.advance_amount) - Number(advancePayment);
      await User.findByIdAndUpdate(bill.customer._id,
        {
          advance_amount: updated_advance_amount.toString(),
          updated_at: moment.utc().valueOf()
        },
        { new: true }
      )
    }

    /* ---------------------------------------------------
       3️⃣ CALCULATE TOTAL & PENDING
    --------------------------------------------------- */
    const totalPaid = Object.values(paidMap)
      .reduce((sum, amt) => sum + amt, 0);

    const payable = Number(bill.payable_amount);
    let pending_amount = payable - totalPaid;

    if (pending_amount < 0) pending_amount = 0;

    /* ---------------------------------------------------
       4️⃣ BILL STATUS LOGIC
    --------------------------------------------------- */
    let billStatus = 'UNPAID';

    if (pending_amount === 0 && totalPaid > 0) {
      billStatus = 'PAID';
    } else if (totalPaid > 0) {
      billStatus = 'PARTIALLY_PAID';
    }

    /* ---------------------------------------------------
       5️⃣ UPDATE PRODUCTS (ONLY FIRST TIME)
    --------------------------------------------------- */
    if (bill.status === 'DRAFTED') {
      for (const singleProduct of bill.products) {
        const product = await Product.findOne({
          imei_number: singleProduct.imei_number,
          status: { $in: ['AVAILABLE', 'RETURN'] }
        });

        if (!product) {
          return res.status(400).json({
            error: `Product with IMEI ${singleProduct.imei_number} not found or already sold`
          });
        }

        product.status = 'SOLD';
        product.sold_at_price = singleProduct.sold_at_price;
        product.updated_at = moment.utc().valueOf();

        await product.save();
      }
    }

    /* ---------------------------------------------------
       6️⃣ UPDATE BILL
    --------------------------------------------------- */
    const updatedBill = await Billing.findByIdAndUpdate(
      req.params.id,
      {
        paid_amount: updatedPaidAmount,
        pending_amount,
        status: billStatus,
        updated_at: moment.utc().valueOf()
      },
      { new: true }
    )
      .populate('customer')
      .populate({
        path: 'products',
        populate: {
          path: 'model',
          populate: { path: 'brand' }
        }
      });


    res.json(updatedBill);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// DELETE /api/billings/:id
router.delete('/:id', async (req, res) => {
  try {
    const billing = await Billing.findById(req.params.id);
    if (!billing) {
      return res.status(404).json({ error: 'Billing not found' });
    }
    if (billing.status === 'DRAFTED') {
      // Soft delete: set status to REMOVED_DRAFTED (or add isDeleted flag)
      billing.status = 'REMOVED_DRAFTED';
    } else if (billing.status === 'PAID' || billing.status === 'UNPAID' || billing.status === 'PARTIALLY_PAID') {
      // Soft delete: set status to REMOVED_CHECKOUT (or add isDeleted flag)
      billing.status = 'REMOVED_CHECKOUT';
      if (billing.products.length > 0) {

        const allProducts = await Product.find({
          _id: { $in: billing.products.map(p => p._id) }
        });


        // Check for other SOLD products with same IMEI
        const otherSold = await Product.find({
          imei_number: { $in: billing.products.map(p => p.imei_number) },
          status: 'SOLD',
          _id: { $nin: billing.products.map(p => p._id) }
        });
        console.log('otherSold: ', otherSold);

        const soldOtherSet = new Set(otherSold.map(p => p.imei_number));
        console.log('soldOtherSet: ', soldOtherSet);

        for (const p of allProducts) {
          if (soldOtherSet.has(p.imei_number)) {
            p.status = 'RETURN';
          } else {
            p.status = 'AVAILABLE';
          }
          p.sold_at_price = undefined;
          p.updated_at = moment.utc().valueOf();
          await p.save();
        }
      }
    }

    billing.updated_at = moment.utc().valueOf();
    await billing.save();

    res.json({
      message: 'Billing soft-deleted (status set to REMOVED)',
      billingId: req.params.id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;