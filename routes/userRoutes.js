const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get all users(CUSTOMER, SUPPLIER, ADMIN) with filters
// GET /api/users?role=CUSTOMER
router.get('/', async (req, res) => {
  try {
    const { role, name, contact_number, type } = req.query;

    let filter = {};

    if (name) {
      filter.name = { $regex: name, $options: 'i' }; // partial, case-insensitive match
    }
    if (contact_number) {
      filter.contact_number = { $regex: contact_number, $options: 'i' }; // partial, case-insensitive match
    }


    if (role) filter.role = role;
    if (type) filter.type = type;
    console.log('filter: ', filter);

    const users = await User.find(filter);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ADMIN login
// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { mobile_number, password } = req.body;
    const user = await User.findOne({ mobile_number });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    if (password === user.password) {
      res.json({ user: { id: user._id, name: user.name, mobile_number: user.mobile_number } });
    } else {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { name, contact_number, role, type, company_name, address, gst_number, email } = req.body;
    const existingUser = await User.findOne({ contact_number });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const user = new User({ name, contact_number, role, type, company_name, address, gst_number, email });
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
