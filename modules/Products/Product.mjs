import mongoose from 'mongoose';
import moment from 'moment';

const productSchema = new mongoose.Schema({
  model: { type: mongoose.Schema.Types.ObjectId, ref: 'Model' },
  imei_number: String,
  sales_price: { type: Number, default: 0 },
  purchase_price: { type: Number, default: 0 },
  gst_purchase_price: { type: Number, default: 0 },
  sold_at_price: { type: Number, default: 0 },
  grade: String,
  engineer_name: String,
  accessories: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: String,
  qc_remark: String,
  is_repaired: { type: Boolean, default: false },

  //repair details
  issue: { type: String },
  repair_parts: [
    { shop: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, part_name: String, cost: { type: Number, default: 0 } }
  ],
  repairer_cost: { type: Number, default: 0 },
  repair_remark: { type: String },
  repair_started_at: { type: Number, default: 0 },
  repair_completed_at: { type: Number, default: 0 },
  repair_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  purchase_cost_including_expenses: { type: Number, default: 0 },
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() },
  created_by: String
});

const Product = mongoose.model('Product', productSchema);

export default Product;
