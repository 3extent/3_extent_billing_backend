import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

/* ===============================
   Register mongoose models
   (IMPORTANT: keep these imports)
================================ */
import './../modules/TableColumns/TableColumn.mjs';
import '../modules/MenuItems/MenuItem.mjs';
import '../modules/UserRoles/UserRole.mjs';
import '../modules/Users/User.mjs';
import '../modules/Products/Product.mjs';
import '../modules/Billings/Billing.mjs';
import '../modules/MaintenanceActivity/MaintenanceActivity.mjs';
import '../modules/MaintenanceCriteria/MaintenanceCriteria.mjs';

/* ===============================
   Routes
================================ */
import userRoutes from '../modules/Users/user.routes.mjs';
import productRoutes from '../modules/Products/product.routes.mjs';
import brandRoutes from '../modules/Brands/brand.routes.mjs';
import modelRoutes from '../modules/Models/model.routes.mjs';
import billingRoutes from '../modules/Billings/billing.routes.mjs';
import maintenanceActivityRoutes from '../modules/MaintenanceActivity/maintenance-activity.routes.mjs';
import maintenanceCriteriaRoutes from '../modules/MaintenanceCriteria/maintenance-criteria.routes.mjs';

app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/billings', billingRoutes);
app.use('/api/maintenance_activity', maintenanceActivityRoutes);
app.use('/api/maintenance_criteria', maintenanceCriteriaRoutes);

/* ===============================
   MongoDB connection (serverless safe)
================================ */
let isConnected = false;

async function connectToDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      connectTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000
    });

    isConnected = true;
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

/* ===============================
   Server start
================================ */
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectToDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    process.exit(1);
  }
})();

export default app;
