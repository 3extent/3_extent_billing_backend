import mongoose from 'mongoose';
import moment from 'moment';


const billingSchema = new mongoose.Schema({
  invoice_number: { type: Number, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  payable_amount: { type: Number, required: true },//Total amount
  paid_amount: [
    {
      method: String,
      amount: Number
    },
    {
      method: String,
      amount: Number
    },
    {
      method: String,
      amount: Number
    },
    {
      method: String,
      amount: Number
    }
  ],//Total amount paid by user
  pending_amount: { type: Number, required: true },//Total amount - paid amount
  advance_amount: { type: Number, default: 0 },//Advance amount

  net_total: { type: Number, required: true },//Show on Bill
  c_gst: { type: Number },//Show on Bill
  s_gst: { type: Number },//Show on Bill
  profitToShow: { type: Number },//Show on Bill

  actualProfit: { type: Number },//Actual profit

  status: { type: String, required: true },
  created_at: { type: Number, default: moment.utc().valueOf() },
  updated_at: { type: Number, default: moment.utc().valueOf() },
  created_by: String
});

// Auto-increment bill_id before saving
billingSchema.pre('save', async function (next) {
  if (this.isNew && !this.invoice_number) {
    try {
      const lastBilling = await this.constructor.findOne({}, {}, { sort: { 'invoice_number': -1 } });
      this.invoice_number = lastBilling ? lastBilling.invoice_number + 1 : 1;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const Billing = mongoose.model('Billing', billingSchema);
export default Billing;