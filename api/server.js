const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();
const app = express();

// Enable JSON body parsing
app.use(express.json());

// CORS configuration
app.use(
  cors({
    origin: true, // allow requests from any origin
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Preflight handler for CORS
app.options("*", cors());

// Import and mount routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/brands', require('./routes/brandRoutes'));
app.use('/api/models', require('./routes/modelRoutes'));
app.use('/api/billings', require('./routes/billingRoutes'));

// MongoDB connection (serverless-safe)
let isConnected = false;

async function connectToDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
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

// Connect to DB
connectToDB().catch(err => {
  console.error("Initial DB connect failed:", err);
});

// Export app for serverless deployment (Vercel / Netlify / AWS Lambda)
module.exports = app;
