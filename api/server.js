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

// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
//   .then(() => {
//     console.log('MongoDB connected');
//     app.listen(process.env.PORT, () => {
//       console.log(`Server running on port ${process.env.PORT}`);
//     });
//   })
//   .catch((err) => console.error(err));


// Export the Express app as a serverless function
module.exports = app;