import moment from 'moment';
import Product from './Product.mjs';
import Brand from '../Brands/Brand.mjs';
import Model from '../Models/Model.mjs';
import User from '../Users/User.mjs';
import Role from '../UserRoles/UserRole.mjs';

async function getOrCreateBrandByName(brand_name) {
  // Find if available or create brand
  let brand = await Brand.findOne({ name: brand_name });
  if (brand) {
    return brand;
  }
  const now = moment.utc().valueOf();
  brand = new Brand({
    name: brand_name,
    created_at: now,
    updated_at: now
  });
  await brand.save();
  return brand;
}

async function getOrCreateModelByNameAndBrand(model_name, brandId) {
  // Find if available or create model
  let model = await Model.findOne({ name: model_name, brand: brandId });
  if (model) {
    return model;
  }
  const now = moment.utc().valueOf();
  model = new Model({
    name: model_name,
    brand: brandId,
    created_at: now,
    updated_at: now
  });
  await model.save();
  return model;
}

export async function validateModelAndSupplier(model_name, supplier_name, brand) {
  const model = await getOrCreateModelByNameAndBrand(model_name, brand._id);

  const supplier_role = await Role.findOne({ name: 'SUPPLIER' });
  let supplier = await User.findOne({ name: supplier_name, role: supplier_role._id });

  if (!supplier) {
    const now = moment.utc().valueOf();
    supplier = new User({
      name: supplier_name,
      role: supplier_role._id,
      created_at: now,
      updated_at: now,
    });
    await supplier.save();
  }

  return { model, supplier };
}

export async function validateImeiAndHandleExisting(imei_number, status) {
  const existing = await Product.find({ imei_number }).select('status');
  const hasAvailable = existing.some(
    p => (p.status || '').toUpperCase() === 'AVAILABLE'
  );

  if (hasAvailable) {
    throw new Error('IMEI already exists with AVAILABLE status');
  }

  return status?.toUpperCase() === 'RETURN' ? 'RETURN' : 'AVAILABLE';
}

export async function createSingleProduct(productData) {
  const {
    brand_name,
    model_name,
    imei_number,
    sales_price,
    purchase_price,
    grade,
    engineer_name,
    accessories,
    supplier_name,
    qc_remark,
    status,
    product_created_at,
    product_updated_at,
    sold_at_price
  } = productData;

  const brand = await getOrCreateBrandByName(brand_name);

  const { model, supplier } =
    await validateModelAndSupplier(model_name, supplier_name, brand);

  const finalStatus =
    await validateImeiAndHandleExisting(imei_number, status);

  return new Product({
    brand,
    model,
    imei_number,
    sales_price,
    purchase_price,
    gst_purchase_price: Number(purchase_price) + 500,
    grade,
    engineer_name,
    accessories,
    supplier,
    qc_remark,
    status: finalStatus,
    created_at: product_created_at,
    updated_at: product_updated_at,
    sold_at_price
  });
}
