import Billing from '../Billings/Billing.mjs';
import User from '../Users/User.mjs';
import Product from '../Products/Product.mjs';
import {
  sumBy,
  now,
  calculateBillStatus,
  calculateGST
} from './billing.helpers.mjs';

/* ===============================
   GET /api/billings
================================ */
export const getBillings = async (req, res) => {
  try {
    const { customer_name, contact_number, imei_number, status, from, to } = req.query;
    const filter = {};

    filter.status = status
      ? status
      : { $nin: ['DRAFTED', 'REMOVED_DRAFTED', 'REMOVED_CHECKOUT'] };

    if (customer_name || contact_number) {
      const userQuery = {};
      if (customer_name) userQuery.name = { $regex: customer_name, $options: 'i' };
      if (contact_number) userQuery.contact_number = { $regex: contact_number, $options: 'i' };

      const users = await User.find(userQuery).select('_id');
      if (!users.length) {
        return res.json({ billings: [], totalAmount: 0, totalRemaining: 0, totalProfit: 0, totalProducts: 0 });
      }
      filter.customer = { $in: users.map(u => u._id) };
    }

    if (imei_number) {
      const products = await Product.find({ imei_number }).select('_id');
      if (!products.length) {
        return res.json({ billings: [], totalAmount: 0, totalRemaining: 0, totalProfit: 0, totalProducts: 0 });
      }
      filter.products = { $in: products.map(p => p._id) };
    }

    if (from || to) {
      filter.created_at = {};
      if (from) filter.created_at.$gte = Number(from);
      if (to) filter.created_at.$lte = Number(to);
    }

    const billings = await Billing.find(filter)
      .populate('customer')
      .populate({ path: 'products', populate: { path: 'model', populate: { path: 'brand' } } })
      .sort({ created_at: -1 });

    res.json({
      billings,
      totalAmount: sumBy(billings, b => b.payable_amount),
      totalRemaining: sumBy(billings, b => b.pending_amount),
      totalProfit: sumBy(billings, b => b.actualProfit),
      totalProducts: sumBy(billings, b => b.products?.length || 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ===============================
   GET /api/billings/:id
================================ */
export const getBillingById = async (req, res) => {
  try {
    const billing = await Billing.findById(req.params.id)
      .populate('customer')
      .populate({
        path: 'products',
        populate: [{ path: 'model', populate: { path: 'brand' } }, { path: 'supplier' }]
      });

    if (!billing) return res.status(404).json({ error: 'Billing not found' });

    res.json({
      billing,
      totalSalesPrice: sumBy(billing.products, p => p.sales_price),
      totalRate: sumBy(billing.products, p => p.sold_at_price),
      totalPurchasePrice: sumBy(billing.products, p => p.purchase_price),
      totalGSTPurchasePrice: sumBy(billing.products, p => p.gst_purchase_price)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ===============================
   POST /api/billing
================================ */
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
    const productDocs = [];

    for (const p of products) {
      const product = await Product.findOne({
        imei_number: p.imei_number,
        status: { $in: ['AVAILABLE', 'RETURN'] }
      });

      if (!product) {
        return res.status(400).json({ error: `Product ${p.imei_number} not available` });
      }

      foundProducts.push({
        productId: product._id,
        final_rate: p.rate,
        purchase_price: product.purchase_price,
        gst_purchase_price: product.gst_purchase_price || product.purchase_price
      });

      productDocs.push(product);
    }

    const totalCost = sumBy(foundProducts, p => p.final_rate);
    const totalPurchase = sumBy(foundProducts, p => p.purchase_price);
    const totalGSTPurchase = sumBy(foundProducts, p => p.gst_purchase_price);

    const profitToShow = totalCost - totalGSTPurchase;
    const actualProfit = totalCost - totalPurchase;

    const pending_amount =
      payable_amount - sumBy(paid_amount, p => p.amount);

    const billStatus = calculateBillStatus(payable_amount, paid_amount, status === 'DRAFTED');
    const { c_gst, s_gst } = calculateGST(profitToShow);

    const billing = await Billing.create({
      customer: customer?._id,
      products: foundProducts.map(p => p.productId),
      payable_amount,
      pending_amount,
      paid_amount,
      status: billStatus,
      profitToShow: profitToShow.toString(),
      actualProfit: actualProfit.toString(),
      net_total: payable_amount + c_gst + s_gst,
      c_gst: c_gst.toString(),
      s_gst: s_gst.toString(),
      created_at: now(),
      updated_at: now()
    });

    if (billStatus !== 'DRAFTED') {
      for (let i = 0; i < productDocs.length; i++) {
        productDocs[i].status = 'SOLD';
        productDocs[i].sold_at_price = foundProducts[i].final_rate;
        productDocs[i].updated_at = now();
        await productDocs[i].save();
      }
    }

    const populated = await Billing.findById(billing._id)
      .populate('customer')
      .populate({ path: 'products', populate: { path: 'model', populate: { path: 'brand' } } });

    res.json({ message: 'Billing created', billing: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ===============================
   PUT /api/billing/payment/:id
================================ */
export const updateBillingPayment = async (req, res) => {
  try {
    const { paid_amount } = req.body;
    const bill = await Billing.findById(req.params.id).populate('customer');

    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const paymentMap = {};
    bill.paid_amount.forEach(p => paymentMap[p.method] = Number(p.amount));
    paid_amount.forEach(p => paymentMap[p.method] = (paymentMap[p.method] || 0) + Number(p.amount));

    const merged = Object.entries(paymentMap).map(([method, amount]) => ({ method, amount: amount.toString() }));

    const pending = bill.payable_amount - sumBy(merged, p => p.amount);
    const status = calculateBillStatus(bill.payable_amount, merged);

    const updated = await Billing.findByIdAndUpdate(
      bill._id,
      { paid_amount: merged, pending_amount: pending, status, updated_at: now() },
      { new: true }
    ).populate('customer');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ===============================
   DELETE /api/billings/:id
================================ */
export const deleteBilling = async (req, res) => {
  try {
    const bill = await Billing.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Billing not found' });

    bill.status = bill.status === 'DRAFTED'
      ? 'REMOVED_DRAFTED'
      : 'REMOVED_CHECKOUT';

    bill.updated_at = now();
    await bill.save();

    res.json({ message: 'Billing removed', id: bill._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
