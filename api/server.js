const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const userRoutes = require('./../routes/userRoutes');

dotenv.config();
const app = express();

app.use(express.json()); // Middleware to parse JSON

app.get('/', (req, res) => {
  res.send('Hello from the server!');
});

app.use('/api/users', userRoutes);

mongoose.connect('mongodb+srv://codadhyay:CGcBiKoQaJuNXpzY@3extentbilling.n6udcps.mongodb.net/billingDB?retryWrites=true&w=majority', {
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