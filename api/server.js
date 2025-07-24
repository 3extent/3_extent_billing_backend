const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const userRoutes = require('./../routes/userRoutes');
const User = require('../models/User');
const cors = require('cors');

dotenv.config();
const app = express();

app.use(express.json()); // Middleware to parse JSON
app.use(cors());

app.use('/api/users', userRoutes);

mongoose.connect('mongodb+srv://codadhyay:CGcBiKoQaJuNXpzY@3extentbilling.n6udcps.mongodb.net/3_extent_billing', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('MongoDB connected');
    app.listen(5000, () => {
      console.log(`Server running on port 5000`);
    });
  })
  .catch((err) => console.error(err));


// Export the Express app as a serverless function
module.exports = app;