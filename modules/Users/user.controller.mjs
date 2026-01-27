import User from './User.mjs';
import Product from '../Products/Product.mjs';
import Brand from '../Brands/Brand.mjs';
import Model from '../Models/Model.mjs';
import Role from '../UserRoles/UserRole.mjs';

// GET /api/users
export const getUsers = async (req, res) => {
  try {
    const { role, name, contact_number, type } = req.query;
    let filter = {};

    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }

    if (contact_number) {
      filter.contact_number = { $regex: contact_number, $options: 'i' };
    }

    if (role) {
      const existingRole = await Role.findOne({ name: role });
      if (!existingRole) {
        return res.status(400).json({ message: 'User role not found' });
      }
      filter.role = existingRole._id;
    }

    if (type) filter.type = type;

    const users = await User.find(filter)
      .populate('products')
      .populate({ path: 'role', populate: { path: 'menu_items' } });

    const part_cost_of_all_users = users.reduce((s, u) => s + u.total_part_cost, 0);
    const payable_amount_of_all_users = users.reduce((s, u) => s + u.payable_amount, 0);
    const pending_amount_of_all_users = users.reduce((s, u) => s + u.pending_amount, 0);

    res.json({
      users,
      part_cost_of_all_users,
      payable_amount_of_all_users,
      pending_amount_of_all_users,
      paid_amount_of_all_users:
        payable_amount_of_all_users - pending_amount_of_all_users
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users/login
export const loginUser = async (req, res) => {
  try {
    const { contact_number, password } = req.body;

    const user = await User.findOne({ contact_number }).populate({
      path: 'role',
      populate: [
        { path: 'menu_items.name' },
        { path: 'menu_items.show_table_columns' },
        { path: 'menu_items.hidden_dropdown_table_columns' }
      ]
    });

    if (!user || password !== user.password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// POST /api/users
export const createUser = async (req, res) => {
  try {
    const {
      name,
      contact_number,
      contact_number2,
      role,
      state,
      address,
      gst_number,
      pan_number,
      firm_name
    } = req.body;

    if (await User.findOne({ contact_number })) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const roleDoc = await Role.findOne({ name: role });
    if (!roleDoc) {
      return res.status(400).json({ message: 'User role not found' });
    }

    const user = new User({
      name,
      contact_number,
      contact_number2,
      role: roleDoc._id,
      state,
      address,
      gst_number,
      pan_number,
      firm_name
    });

    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/users/:id
export const getUserById = async (req, res) => {
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

    let productFilters = {};

    if (imei_number) {
      const p = await Product.findOne({ imei_number });
      if (!p) return res.json({ error: `Product with IMEI ${imei_number} not found` });
      productFilters._id = p._id;
    }

    if (grade) productFilters.grade = { $regex: grade, $options: 'i' };

    productFilters.status = status
      ? { $in: status.split(',').filter(s => s !== 'REMOVED'), $ne: 'REMOVED' }
      : { $ne: 'REMOVED' };

    if (is_repaired !== undefined) {
      productFilters.is_repaired = is_repaired === 'true' || is_repaired === true;
    }

    if (from || to) {
      productFilters.created_at = {
        ...(from && { $gte: Number(from) }),
        ...(to && { $lte: Number(to) })
      };
    }

    if (repair_from || repair_to) {
      productFilters.repair_started_at = {
        ...(repair_from && { $gte: Number(repair_from) }),
        ...(repair_to && { $lte: Number(repair_to) })
      };
    }

    if (brandName) {
      const brand = await Brand.findOne({ name: { $regex: brandName, $options: 'i' } });
      if (brand) {
        const models = await Model.find({ brand: brand._id });
        productFilters.model = { $in: models.map(m => m._id) };
      }
    } else if (modelName) {
      const model = await Model.findOne({ name: { $regex: modelName, $options: 'i' } });
      if (!model) return res.json({ error: `Model ${modelName} not found` });
      productFilters.model = model._id;
    }

    const user = await User.findById(req.params.id)
      .populate({
        path: 'products',
        match: productFilters,
        populate: { path: 'model', populate: { path: 'brand' } }
      })
      .populate({
        path: 'repair_activities',
        populate: [
          { path: 'product', match: productFilters, populate: { path: 'model' } },
          { path: 'repairer', ...(repairer_name && { match: { name: repairer_name } }) }
        ]
      });

    if (!user) return res.status(404).json({ error: 'User not found' });

    user.repair_activities = user.repair_activities.filter(
      ra => ra.product && ra.repairer
    );

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/users/:id
export const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/users/payment/:id
export const updateUserPayment = async (req, res) => {
  try {
    const { paid_amount, payable_amount, total_part_cost } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let payable = (Number(user.payable_amount) || 0) + (Number(payable_amount) || 0);

    const paidMap = {};
    user.paid_amount.forEach(p => (paidMap[p.method] = Number(p.amount)));

    for (const p of paid_amount) {
      paidMap[p.method] = (paidMap[p.method] || 0) + Number(p.amount);
    }

    const pending_amount =
      payable - Object.values(paidMap).reduce((s, a) => s + a, 0);

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        payable_amount: payable,
        paid_amount: Object.entries(paidMap).map(([m, a]) => ({
          method: m,
          amount: a.toString()
        })),
        pending_amount,
        total_part_cost
      },
      { new: true }
    );

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
