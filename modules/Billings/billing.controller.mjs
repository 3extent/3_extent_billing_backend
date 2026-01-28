import moment from 'moment';
import Billing from './Billing.mjs';
import User from '../Users/User.mjs';
import Product from '../Products/Product.mjs';

/* ======================================================
   GET /api/billings
====================================================== */
export const getBillings = async (req, res) => {
  try {
    const {
      customer_name,
      contact_number,
      imei_number,
      status,
      from,
      to
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    } else {
      filter.status = { $nin: ['DRAFTED', 'REMOVED_DRAFTED', 'REMOVED_CHECKOUT'] };
    }

    // -------- CUSTOMER FILTER --------
    if (customer_name || contact_number) {
      const userQuery = {};
      if (customer_name) userQuery.name = { $regex: customer_name, $options: 'i' };
      if (contact_number) userQuery.contact_number = { $regex: contact_number, $options: 'i' };

      const usersFromDB = await User.find(userQuery).select('_id');
      if (!usersFromDB.length) {
        return res.json({
          billings: [],
          totalAmount: 0,
          totalRemaining: 0,
          totalProfit: 0,
          totalProducts: 0
        });
      }

      filter.customer = { $in: usersFromDB.map(u => u._id) };
    }

    // -------- IMEI FILTER --------
    if (imei_number) {
      const productsFromDB = await Product.find({ imei_number }).select('_id');
      if (!productsFromDB.length) {
        return res.json({
          billings: [],
          totalAmount: 0,
          totalRemaining: 0,
          totalProfit: 0,
          totalProducts: 0
        });
      }

      filter.products = { $in: productsFromDB.map(p => p._id) };
    }

    // -------- DATE FILTER --------
    if (from || to) {
      filter.created_at = {};
      if (from) filter.created_at.$gte = Number(from);
      if (to) filter.created_at.$lte = Number(to);
    }

    const billings = await Billing.find(filter)
      .populate('customer')
      .populate({
        path: 'products',
        populate: { path: 'model', populate: { path: 'brand' } }
      })
      .sort({ created_at: -1 });

    const totalAmount = billings.reduce((s, b) => s + Number(b.payable_amount || 0), 0);
    const totalRemaining = billings.reduce((s, b) => s + Number(b.pending_amount || 0), 0);
    const totalProfit = billings.reduce((s, b) => s + Number(b.actualProfit || 0), 0);
    const totalProducts = billings.reduce((s, b) => s + (b.products?.length || 0), 0);

    res.json({ billings, totalAmount, totalRemaining, totalProfit, totalProducts });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   GET /api/billings/:id
====================================================== */
export const getBillingById = async (req, res) => {
  try {
    const billing = await Billing.findById(req.params.id)
      .populate('customer')
      .populate({
        path: 'products',
        populate: [
          { path: 'model', populate: { path: 'brand' } },
          { path: 'supplier' }
        ]
      });

    if (!billing) {
      return res.status(404).json({ error: 'Billing not found' });
    }

    const totalSalesPrice = billing.products.reduce(
      (s, p) => s + Number(p.sales_price || 0), 0
    );
    const totalRate = billing.products.reduce(
      (s, p) => s + Number(p.sold_at_price || 0), 0
    );
    const totalPurchasePrice = billing.products.reduce(
      (s, p) => s + Number(p.purchase_price || 0), 0
    );
    const totalGSTPurchasePrice = billing.products.reduce(
      (s, p) => s + Number(p.gst_purchase_price || p.purchase_price || 0), 0
    );

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
};

/* ======================================================
   POST /api/billing
====================================================== */
export const createBilling = async (req, res) => {
  try {
    const { customer_name, contact_number, products, payable_amount, paid_amount = [], status } = req.body;

    if (!products?.length) {
      return res.status(400).json({ error: 'Products required' });
    }

    let customer = await User.findOne({ contact_number });
    if (!customer && status !== 'DRAFTED') {
      return res.status(400).json({ error: 'Customer not found' });
    }

    const foundProducts = [];
    const updatedProducts = [];

    for (const item of products) {
      const product = await Product.findOne({
        imei_number: item.imei_number,
        status: { $in: ['AVAILABLE', 'RETURN'] }
      });

      if (!product) {
        return res.status(400).json({ error: `Product ${item.imei_number} not found` });
      }

      foundProducts.push({
        productId: product._id,
        final_rate: item.rate,
        purchase_price: product.purchase_price,
        gst_purchase_price: product.gst_purchase_price || product.purchase_price
      });

      updatedProducts.push(product);
    }

    const totalCost = foundProducts.reduce((s, p) => s + Number(p.final_rate), 0);
    const totalPurchase = foundProducts.reduce((s, p) => s + Number(p.purchase_price), 0);
    const totalGSTPurchase = foundProducts.reduce((s, p) => s + Number(p.gst_purchase_price), 0);

    const profitToShow = totalCost - totalGSTPurchase;
    const actualProfit = totalCost - totalPurchase;

    const totalPaid = paid_amount.reduce((s, p) => s + Number(p.amount || 0), 0);
    const pending_amount = payable_amount - totalPaid;

    let billStatus = status;
    if (pending_amount === 0) billStatus = 'PAID';
    else if (totalPaid > 0) billStatus = 'PARTIALLY_PAID';
    else billStatus = 'UNPAID';

    let c_gst = 0, s_gst = 0;
    let net_total = payable_amount;

    if (profitToShow > 0) {
      c_gst = profitToShow * 0.09;
      s_gst = profitToShow * 0.09;
      net_total += c_gst + s_gst;
    }

    const billing = await Billing.create({
      customer: customer?._id,
      products: foundProducts.map(p => p.productId),
      payable_amount,
      paid_amount,
      pending_amount,
      status: billStatus,
      profitToShow: profitToShow.toString(),
      actualProfit: actualProfit.toString(),
      c_gst: c_gst.toString(),
      s_gst: s_gst.toString(),
      net_total,
      created_at: moment.utc().valueOf(),
      updated_at: moment.utc().valueOf()
    });

    if (billStatus !== 'DRAFTED') {
      for (const p of updatedProducts) {
        p.status = 'SOLD';
        p.sold_at_price = foundProducts.find(fp => fp.productId.equals(p._id)).final_rate;
        p.updated_at = moment.utc().valueOf();
        await p.save();
      }
    }

    res.json({ message: 'Billing created successfully', billing });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   PUT /api/billing/:id
====================================================== */
export const updateBilling = async (req, res) => {
  try {
    const {
      customer_name,
      contact_number,
      products,
      payable_amount,
      paid_amount = [],
      advance_amount,
      status
    } = req.body;

    if (!customer_name || !contact_number || !Array.isArray(products)) {
      return res.status(400).json({
        error: 'Customer name, contact number and products array are required'
      });
    }

    const bill = await Billing.findById(req.params.id).lean();
    if (!bill) {
      return res.status(404).json({ error: 'Billing record not found' });
    }

    const existingCustomer = await User.findOne({ contact_number });
    if (!existingCustomer) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    const customerId = existingCustomer._id;

    /* ---------------- OLD & NEW PRODUCTS ---------------- */
    const oldProductIds = bill.products.map(id => id.toString());
    const incomingImeis = products.map(p => p.imei_number);

    const incomingRateMap = {};
    for (const p of products) {
      incomingRateMap[p.imei_number] = p.rate;
    }

    const oldProducts = await Product.find({ _id: { $in: oldProductIds } });
    const oldImeis = oldProducts.map(p => p.imei_number);

    const oldByImei = {};
    for (const p of oldProducts) oldByImei[p.imei_number] = p;

    const removedImeis = oldImeis.filter(i => !incomingImeis.includes(i));
    const keptImeis = oldImeis.filter(i => incomingImeis.includes(i));
    const newAddedImeis = incomingImeis.filter(i => !oldImeis.includes(i));

    /* ---------------- HANDLE REMOVED PRODUCTS ---------------- */
    if (removedImeis.length > 0) {
      const removedProducts = oldProducts.filter(p =>
        removedImeis.includes(p.imei_number)
      );

      const otherSold = await Product.find({
        imei_number: { $in: removedImeis },
        status: 'SOLD',
        _id: { $nin: removedProducts.map(p => p._id) }
      });

      const soldOtherSet = new Set(otherSold.map(p => p.imei_number));

      for (const p of removedProducts) {
        p.status = soldOtherSet.has(p.imei_number) ? 'RETURN' : 'AVAILABLE';
        p.sold_at_price = undefined;
        p.updated_at = moment.utc().valueOf();
        await p.save();
      }
    }

    /* ---------------- VALIDATE NEW PRODUCTS ---------------- */
    let newlyAddedProducts = [];
    if (newAddedImeis.length > 0) {
      newlyAddedProducts = await Product.find({
        imei_number: { $in: newAddedImeis },
        status: { $in: ['AVAILABLE', 'RETURN'] }
      });

      const foundImeis = newlyAddedProducts.map(p => p.imei_number);
      const missing = newAddedImeis.filter(i => !foundImeis.includes(i));

      if (missing.length > 0) {
        return res.status(400).json({
          error: `Products not found or unavailable: ${missing.join(', ')}`
        });
      }
    }

    /* ---------------- BUILD PRODUCT LIST ---------------- */
    const foundProducts = [];
    const updatedProducts = [];

    for (const imei of keptImeis) {
      const p = oldByImei[imei];
      foundProducts.push({
        productId: p._id,
        final_rate: incomingRateMap[imei],
        purchase_price: p.purchase_price,
        gst_purchase_price: p.gst_purchase_price || p.purchase_price
      });
      updatedProducts.push(p);
    }

    for (const p of newlyAddedProducts) {
      foundProducts.push({
        productId: p._id,
        final_rate: incomingRateMap[p.imei_number],
        purchase_price: p.purchase_price,
        gst_purchase_price: p.gst_purchase_price || p.purchase_price
      });
      updatedProducts.push(p);
    }

    /* ---------------- CALCULATIONS ---------------- */
    const totalPaid = paid_amount.reduce(
      (s, p) => s + Number(p.amount || 0),
      0
    );

    const pending_amount = Number(payable_amount) - totalPaid;

    const totalCost = foundProducts.reduce(
      (s, p) => s + Number(p.final_rate),
      0
    );
    const totalPurchase = foundProducts.reduce(
      (s, p) => s + Number(p.purchase_price),
      0
    );
    const totalGSTPurchase = foundProducts.reduce(
      (s, p) => s + Number(p.gst_purchase_price),
      0
    );

    const profitToShow = totalCost - totalGSTPurchase;
    const actualProfit = totalCost - totalPurchase;

    let c_gst = 0;
    let s_gst = 0;
    let net_total = Number(payable_amount);

    if (profitToShow > 0) {
      c_gst = profitToShow * 0.09;
      s_gst = profitToShow * 0.09;
      net_total += c_gst + s_gst;
    }

    /* ---------------- UPDATE BILL ---------------- */
    const savedBill = await Billing.findByIdAndUpdate(
      req.params.id,
      {
        customer: customerId,
        products: foundProducts.map(p => p.productId),
        payable_amount,
        pending_amount,
        paid_amount,
        advance_amount,
        status,
        profitToShow: profitToShow.toString(),
        actualProfit: actualProfit.toString(),
        c_gst: c_gst.toString(),
        s_gst: s_gst.toString(),
        net_total,
        updated_at: moment.utc().valueOf()
      },
      { new: true }
    );

    /* ---------------- UPDATE PRODUCTS ---------------- */
    for (const product of updatedProducts) {
      if (status !== 'DRAFTED') product.status = 'SOLD';

      const fp = foundProducts.find(
        f => f.productId.toString() === product._id.toString()
      );
      if (fp) product.sold_at_price = fp.final_rate;

      product.updated_at = moment.utc().valueOf();
      await product.save();
    }

    /* ---------------- UPDATE CUSTOMER ADVANCE ---------------- */
    const totalAdvance =
      (Number(existingCustomer.advance_amount) || 0) +
      Number(advance_amount || 0);

    await User.findByIdAndUpdate(existingCustomer._id, {
      advance_amount: totalAdvance.toString(),
      updated_at: moment.utc().valueOf()
    });

    const populatedBilling = await Billing.findById(savedBill._id)
      .populate('customer')
      .populate({
        path: 'products',
        populate: { path: 'model', populate: { path: 'brand' } }
      });

    res.json({
      message: 'Billing updated successfully',
      billing: populatedBilling
    });

  } catch (err) {
    console.error('Error updating billing:', err);
    res.status(500).json({ error: err.message });
  }
};


/* ======================================================
   PUT /api/billing/payment/:id
====================================================== */
export const updateBillingPayment = async (req, res) => {
  try {
    const { paid_amount } = req.body;

    if (!Array.isArray(paid_amount) || paid_amount.length === 0) {
      return res.status(400).json({
        error: 'paid_amount must be a non-empty array'
      });
    }

    const bill = await Billing.findById(req.params.id)
      .populate('customer')
      .populate({
        path: 'products',
        populate: { path: 'model', populate: { path: 'brand' } }
      });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    /* ---------------- MERGE PAYMENTS ---------------- */
    const paidMap = {};

    bill.paid_amount.forEach(p => {
      paidMap[p.method] = Number(p.amount);
    });

    for (const p of paid_amount) {
      if (!p.method || p.amount == null) {
        return res.status(400).json({
          error: 'Each payment must have method and amount'
        });
      }

      paidMap[p.method] =
        (paidMap[p.method] || 0) + Number(p.amount);
    }

    const updatedPaidAmount = Object.keys(paidMap).map(method => ({
      method,
      amount: paidMap[method].toString()
    }));

    /* ---------------- HANDLE ADVANCE ---------------- */
    const advancePayment = paid_amount
      .filter(p => p.method === 'advance_amount')
      .reduce((s, p) => s + Number(p.amount), 0);

    if (advancePayment > 0) {
      const updatedAdvance =
        Number(bill.customer.advance_amount || 0) - advancePayment;

      await User.findByIdAndUpdate(bill.customer._id, {
        advance_amount: updatedAdvance.toString(),
        updated_at: moment.utc().valueOf()
      });
    }

    /* ---------------- CALCULATE STATUS ---------------- */
    const totalPaid = Object.values(paidMap).reduce((s, v) => s + v, 0);
    let pending_amount = Number(bill.payable_amount) - totalPaid;
    if (pending_amount < 0) pending_amount = 0;

    let billStatus = 'UNPAID';
    if (pending_amount === 0 && totalPaid > 0) billStatus = 'PAID';
    else if (totalPaid > 0) billStatus = 'PARTIALLY_PAID';

    /* ---------------- FIRST TIME FROM DRAFT ---------------- */
    if (bill.status === 'DRAFTED') {
      for (const prod of bill.products) {
        const product = await Product.findOne({
          imei_number: prod.imei_number,
          status: { $in: ['AVAILABLE', 'RETURN'] }
        });

        if (!product) {
          return res.status(400).json({
            error: `Product ${prod.imei_number} already sold`
          });
        }

        product.status = 'SOLD';
        product.sold_at_price = prod.sold_at_price;
        product.updated_at = moment.utc().valueOf();
        await product.save();
      }
    }

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
        populate: { path: 'model', populate: { path: 'brand' } }
      });

    res.json(updatedBill);

  } catch (err) {
    console.error('Payment update error:', err);
    res.status(500).json({ error: err.message });
  }
};


/* ======================================================
   DELETE /api/billings/:id
====================================================== */
export const deleteBilling = async (req, res) => {
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
};
