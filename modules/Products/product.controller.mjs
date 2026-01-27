import moment from 'moment';
import Product from './Product.mjs';
import User from '../Users/User.mjs';

import {
  createSingleProduct
} from './product.helpers.mjs';


/* GET /api/products */
export const getProducts = async (req, res) => {
  try {
    let filter = { status: { $ne: 'REMOVED' } };

    if (req.query.imei_number) {
      filter.imei_number = { $regex: req.query.imei_number, $options: 'i' };
    }

    const products = await Product.find(filter)
      .populate({ path: 'model', populate: { path: 'brand' } })
      .populate('supplier')
      .populate('repair_by')
      .sort({ created_at: -1 });

    const part_cost_of_all_products =
      products.reduce((s, p) => s + (Number(p.part_cost) || 0), 0);

    const repairer_cost_of_all_products =
      products.reduce((s, p) => s + (Number(p.repairer_cost) || 0), 0);

    const purchase_total_of_all_products =
      products.reduce((s, p) => s + (Number(p.purchase_price) || 0), 0);

    res.json({
      products,
      part_cost_of_all_products,
      repairer_cost_of_all_products,
      purchase_total_of_all_products
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* POST /api/products */
export const createProduct = async (req, res) => {
  try {
    const product = await createSingleProduct(req.body);
    await product.save();

    const supplier = await User.findById(product.supplier._id);

    const paidAmounts =
      supplier.paid_amount.reduce((s, p) => s + p.amount, 0);

    supplier.payable_amount =
      (supplier.payable_amount || 0) + Number(product.purchase_price);

    supplier.pending_amount =
      supplier.payable_amount - paidAmounts;

    supplier.products.push(product._id);
    await supplier.save();

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/* DELETE /api/products/:id */
export const removeProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.status === 'SOLD') {
      return res.status(400).json({ error: 'Cannot remove SOLD product' });
    }

    product.status = 'REMOVED';
    product.updated_at = moment.utc().valueOf();
    await product.save();

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
