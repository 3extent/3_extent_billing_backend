import Brand from './Brand.mjs';
import moment from 'moment';

// GET /api/brands
export const getBrands = async (req, res) => {
  try {
    const { name } = req.query;

    const filter = name
      ? { name: { $regex: name, $options: 'i' } }
      : {};

    const brands = await Brand.find(filter);
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/brands
export const createBrand = async (req, res) => {
  try {
    const { name } = req.body;

    const existingBrand = await Brand.findOne({ name });
    if (existingBrand) {
      return res.status(400).json({ error: 'Brand already exists' });
    }

    const brand = new Brand({
      name,
      created_at: moment.utc().valueOf(),
      updated_at: moment.utc().valueOf()
    });

    await brand.save();
    res.json(brand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/brands/:id
export const getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    res.json(brand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/brands/:id
export const updateBrand = async (req, res) => {
  try {
    const { name } = req.body;

    const existingBrand = await Brand.findOne({
      name,
      _id: { $ne: req.params.id } // ✅ avoid self-duplicate
    });

    if (existingBrand) {
      return res.status(400).json({ error: 'Brand already exists' });
    }

    const brand = await Brand.findByIdAndUpdate(
      req.params.id,
      {
        name,
        updated_at: moment.utc().valueOf()
      },
      { new: true }
    );

    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    res.json(brand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
