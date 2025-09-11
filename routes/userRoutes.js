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
    const { contact_number, password } = req.body;
    const user = await User.findOne({ contact_number });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    if (password === user.password) {
      res.json({ user: { id: user._id, name: user.name, contact_number: user.contact_number } });
    } else {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  console.log(req.body);
  try {
    const { name, contact_number, contact_number2, role, state, address, gst_number, pan_number, firm_name } = req.body;
    const existingUser = await User.findOne({ contact_number });
    console.log(existingUser);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const user = new User({ name, contact_number, contact_number2, role, state, address, gst_number, pan_number, firm_name });
    console.log(user);
    await user.save();
    console.log(user);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id - get a single user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id - update a single user
router.put('/:id', async (req, res) => {
  try {
    const { name, contact_number, contact_number2, role, state, address, gst_number, pan_number, firm_name } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { name, contact_number, contact_number2, role, state, address, gst_number, pan_number, firm_name }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
