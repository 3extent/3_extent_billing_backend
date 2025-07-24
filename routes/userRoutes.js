const express = require('express');
const router = express.Router();
const User = require('../models/User');


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

// GET /api/users?role=CUSTOMER
router.get('/users', async (req, res) => {
  try {
    const { role, name, mobile_number, company_name } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (mobile_number) filter.mobile_number = mobile_number;
    if (company_name) filter.company_name = company_name;
    if (name) filter.name = name; 
    const users = await User.find(filter);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
