const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());

// then import model files so mongoose registers them
require("./../models/MenuItem");
require("./../models/UserRole");
require("./../models/User");
require("./../models/Product");
require("./../models/Billing");

// Import routes
app.use('/api/users', require('./../routes/userRoutes'));
app.use('/api/products', require('./../routes/productRoutes'));
app.use('/api/brands', require('./../routes/brandRoutes'));
app.use('/api/models', require('./../routes/modelRoutes'));
app.use('/api/billings', require('./../routes/billingRoutes'));

// Database connection helper for serverless environments
let isConnected = false;
async function connectToDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 30000,       // Increase connection timeout to 30 seconds
      serverSelectionTimeoutMS: 30000 // Wait up to 30 seconds for server selection
    });
    isConnected = true;
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

// Setup server
(async () => {
  try {
    await connectToDB();
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  } catch (err) {
    process.exit(1);
  }
})();

module.exports = app;
