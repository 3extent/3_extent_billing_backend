const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');


// GET /api/billings?name="Samsung"
router.get('/', async (req, res) => {
  try {
    const { customer_name, contact_number, createdAt, status } = req.query;

    let filter = {};
    if (customer_name) {
      filter.customer_name = { $regex: customer_name, $options: 'i' }; // partial, case-insensitive match
    }
    if (contact_number) {
      filter.contact_number = { $regex: contact_number, $options: 'i' }; // partial, case-insensitive match
    }
    if (createdAt) {
      filter.createdAt = { $regex: createdAt, $options: 'i' }; // partial, case-insensitive match
    }
    if (status) {
      filter.status = { $regex: status, $options: 'i' }; // partial, case-insensitive match
    }

    const billings = await Billing.find(filter);
    res.json(billings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/billing
// router.post('/', async (req, res) => {
//   try {
//     const { name } = req.body;

//     const existingBilling = await Billing.findOne({ name });
//     if (existingBilling) {
//       return res.status(400).json({ error: 'Billing already exists' });
//     }

//     const billing = new Billing({ name });
//     await billing.save();
//     res.json(billing);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

module.exports = router;
