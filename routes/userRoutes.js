const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Model = require('../models/Model');
const Role = require('../models/UserRole');

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


    if (role) {
      console.log('role: ', role);
      const existingRole = await Role.findOne({ name: role });
      console.log('existingRole: ', existingRole);
      if (!existingRole) {
        return res.status(400).json({ message: 'User role not found' });
      }
      filter.role = existingRole._id
    }

    if (type) filter.type = type;
    console.log('filter: ', filter);

    const users = await User.find(filter).populate('products').populate({ path: 'role', populate: { path: 'menu_items' } });
    let part_cost_of_all_users = users.reduce((sum, user) => sum + user.total_part_cost, 0);
    let payable_amount_of_all_users = users.reduce((sum, user) => sum + user.payable_amount, 0);

    let pending_amount_of_all_users = users.reduce((sum, user) => sum + user.pending_amount, 0);
    let paid_amount_of_all_users = payable_amount_of_all_users - pending_amount_of_all_users;
    res.json({
      users,
      part_cost_of_all_users,
      payable_amount_of_all_users,
      pending_amount_of_all_users,
      paid_amount_of_all_users
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ADMIN login
// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { contact_number, password } = req.body;
    const user = await User.findOne({ contact_number }).populate({ path: 'role', populate: { path: 'menu_items' } });;
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    if (password === user.password) {
      res.json({ user });
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
    const existingRole = await Role.findOne({ name: role });
    console.log('existingRole: ', existingRole);
    if (!existingRole) {
      return res.status(400).json({ message: 'User role not found' });
    }


    const user = new User({ name, contact_number, contact_number2, role: existingRole._id, state, address, gst_number, pan_number, firm_name });
    console.log(user);
    await user.save();
    console.log(user);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id - get a single user with filtered products
router.get('/:id', async (req, res) => {
  try {
    const {
      imei_number,
      grade,
      brandName,
      modelName,
      status,
      from,
      to,
      repairer_name,
      is_repaired,
      repair_from,
      repair_to
    } = req.query;

    /* ---------------------------------------------------
       PRODUCT LEVEL FILTERS
    --------------------------------------------------- */
    let productFilters = {};

    // IMEI filter
    if (imei_number) {
      const productFromDB = await Product.findOne({ imei_number });
      if (!productFromDB) {
        return res.json({ error: `Product with IMEI ${imei_number} not found` });
      }
      productFilters._id = productFromDB._id;
    }

    // Grade
    if (grade) {
      productFilters.grade = { $regex: grade, $options: 'i' };
    }

    // Status
    if (status) {
      const statusArray = status.split(",");
      productFilters.status = {
        $in: statusArray.filter(s => s !== "REMOVED"),
        $ne: "REMOVED"
      };
    } else {
      productFilters.status = { $ne: "REMOVED" };
    }

    // is_repaired (ensure boolean)
    if (is_repaired !== undefined) {
      productFilters.is_repaired = is_repaired === 'true' || is_repaired === true;
    }

    // Created date range
    if (from || to) {
      let range = {};
      if (from && !isNaN(Number(from))) range.$gte = Number(from);
      if (to && !isNaN(Number(to))) range.$lte = Number(to);
      if (Object.keys(range).length) {
        productFilters.created_at = range;
      }
    }

    // Repair date range
    if (repair_from || repair_to) {
      let repairRange = {};
      if (repair_from && !isNaN(Number(repair_from))) repairRange.$gte = Number(repair_from);
      if (repair_to && !isNaN(Number(repair_to))) repairRange.$lte = Number(repair_to);
      if (Object.keys(repairRange).length) {
        productFilters.repair_started_at = repairRange;
      }
    }

    // Brand / Model filter
    if (brandName) {
      const brandFromDb = await Brand.findOne({
        name: { $regex: brandName, $options: "i" }
      });

      if (brandFromDb) {
        const models = await Model.find({ brand: brandFromDb._id });
        productFilters.model = { $in: models.map(m => m._id) };
      }
    } else if (modelName) {
      const modelFromDb = await Model.findOne({
        name: { $regex: modelName, $options: "i" }
      });

      if (!modelFromDb) {
        return res.json({ error: `Model ${modelName} not found` });
      }

      productFilters.model = modelFromDb._id;
    }

    /* ---------------------------------------------------
       FETCH USER WITH POPULATIONS
    --------------------------------------------------- */
    const user = await User.findById(req.params.id)
      .populate({
        path: "products",
        match: productFilters,
        populate: {
          path: "model",
          populate: { path: "brand" }
        }
      })
      .populate({
        path: "repair_activities",
        populate: [
          {
            path: "product",
            match: productFilters,
            populate: { path: "model" }
          },
          {
            path: "repairer",
            ...(repairer_name ? { match: { name: repairer_name } } : {})
          }
        ]
      });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    /* ---------------------------------------------------
       CLEAN NULL REPAIR ACTIVITIES
    --------------------------------------------------- */
    user.repair_activities = user.repair_activities.filter(
      ra => ra.product && ra.repairer
    );

    /* ---------------------------------------------------
       CALCULATIONS
    --------------------------------------------------- */
    const purchase_total_of_all_products = user.products.reduce(
      (sum, product) => sum + (Number(product.purchase_price) || 0),
      0
    );

    const total_parts_cost_used = user.products.reduce(
      (sum, product) => sum + (Number(product.part_cost) || 0),
      0
    );

    const total_payable_amount = user.products.reduce(
      (sum, product) => sum + (Number(product.repairer_cost) || 0),
      0
    );

    const total_payable_amount_of_parts = user.repair_activities.reduce(
      (sum, activity) => sum + (Number(activity.cost) || 0),
      0
    );

    /* ---------------------------------------------------
       RESPONSE
    --------------------------------------------------- */
    res.json({
      user,
      purchase_total_of_all_products,
      total_parts_cost_used,
      total_payable_amount,
      total_payable_amount_of_parts
    });

  } catch (err) {
    console.error(err);
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


// PUT /api/users/payment/:id - update a single user for payment
router.put('/payment/:id', async (req, res) => {
  try {
    const { paid_amount, payable_amount, total_part_cost } = req.body;
    const user = await User.findById(req.params.id).populate({ path: 'products', populate: { path: 'model' } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    let payable = parseInt(user.payable_amount) || 0 + parseInt(payable_amount) || 0;

    const paidMap = {};

    // Existing payments from DB
    user.paid_amount.forEach(p => {
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

    const totalPaid = Object.values(paidMap)
      .reduce((sum, amt) => sum + amt, 0);

    let pending_amount = parseInt(payable) - parseInt(totalPaid);

    const updatedUser = await User.findByIdAndUpdate(req.params.id,
      {
        payable_amount: payable,
        paid_amount: updatedPaidAmount,
        pending_amount,
        total_part_cost
      }, { new: true });


    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
