import moment from 'moment';
import Product from './Product.mjs';
import Brand from '../Brands/Brand.mjs';
import Model from '../Models/Model.mjs';
import User from '../Users/User.mjs';
import Role from '../UserRoles/UserRole.mjs';

export async function validateModelAndSupplier(model_name, supplier_name, brand) {
  let model = await Model.findOne({ name: model_name, brand: brand._id });

  if (!model) {
    model = new Model({
      name: model_name,
      brand: brand._id,
      created_at: moment.utc().valueOf(),
      updated_at: moment.utc().valueOf()
    });
    await model.save();
  }

  const supplier_role = await Role.findOne({ name: 'SUPPLIER' });
  const supplier = await User.findOne({ name: supplier_name, role: supplier_role._id });

  if (!supplier) throw new Error('Supplier not found');

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
    status
  } = productData;

  let brand = await Brand.findOne({ name: brand_name });

  if (!brand) {
    brand = new Brand({
      name: brand_name,
      created_at: moment.utc().valueOf(),
      updated_at: moment.utc().valueOf()
    });
    await brand.save();
  }

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
    status: finalStatus
  });
}
