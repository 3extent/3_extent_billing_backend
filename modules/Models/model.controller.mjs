import Brand from '../Brands/Brand.mjs';
import Model from './Model.mjs';
import moment from 'moment';

// GET /api/models
export const getModels = async (req, res) => {
  try {
    const { modelName, brandName } = req.query;
    const filter = {};

    // If brand name provided, resolve brand ObjectId
    if (brandName) {
      const brandFromDb = await Brand.findOne({
        name: { $regex: brandName, $options: 'i' }
      });

      if (!brandFromDb) {
        return res.status(404).json({ message: 'Brand not found' });
      }

      filter.brand = brandFromDb._id;
    }

    // If model name provided
    if (modelName) {
      filter.name = { $regex: modelName, $options: 'i' };
    }

    const models = await Model.find(filter).populate('brand');
    res.json(models);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// POST /api/models
export const createModel = async (req, res) => {
  try {
    const { name, brand_name, ramStorage } = req.body;

    if (!name || !brand_name) {
      return res.status(400).json({ error: 'name and brand_name are required' });
    }

    const brandDoc = await Brand.findOne({
      name: { $regex: brand_name, $options: 'i' }
    });

    if (!brandDoc) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const brandId = brandDoc._id;

    const ramStorageList = Array.isArray(ramStorage)
      ? ramStorage
      : ramStorage
        ? [ramStorage]
        : [];

    if (!ramStorageList.length) {
      return res.status(400).json({ error: 'ramStorage is required' });
    }

    const created = [];
    const skipped = [];

    for (const ram of ramStorageList) {
      let modelName = `${name} ${ram.ram}/${ram.storage}GB`;

      if (!ram.ram?.trim() && ram.storage) {
        modelName = `${name} ${ram.storage}GB`;
      }

      const exists = await Model.findOne({
        name: modelName,
        brand: brandId
      });

      if (exists) {
        skipped.push(ram);
        continue;
      }

      const model = new Model({
        name: modelName,
        brand: brandId,
        created_at: moment.utc().valueOf(),
        updated_at: moment.utc().valueOf()
      });

      try {
        await model.save();
        created.push(model);
      } catch (e) {
        if (e?.code === 11000) {
          skipped.push(ram);
          continue;
        }
        throw e;
      }
    }

    res.status(201).json({
      createdCount: created.length,
      created,
      skipped,
      message: skipped.length
        ? 'Some models already existed and were skipped'
        : 'Models created'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/models/:id
export const getModelById = async (req, res) => {
  try {
    const model = await Model.findById(req.params.id).populate('brand');

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json(model);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/models/:id
export const updateModel = async (req, res) => {
  try {
    const { name, brand_name } = req.body;

    const brandDoc = await Brand.findOne({
      name: { $regex: brand_name, $options: 'i' }
    });

    if (!brandDoc) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const brandId = brandDoc._id;

    const existingModel = await Model.findOne({
      name,
      brand: brandId,
      _id: { $ne: req.params.id } // ✅ important fix
    });

    if (existingModel) {
      return res.status(400).json({ error: 'Model already exists' });
    }

    const model = await Model.findByIdAndUpdate(
      req.params.id,
      {
        name,
        brand: brandId,
        updated_at: moment.utc().valueOf()
      },
      { new: true }
    ).populate('brand');

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json(model);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
