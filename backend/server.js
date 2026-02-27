require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const queryRoutes = require('./routes/query');
const authRoutes = require('./routes/auth');

app.use('/api', queryRoutes);
app.use('/api/auth', authRoutes);

app.get('/api/test', (req, res) => {
  res.json({ status: "Backend running" });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error("Failed to start server due to MongoDB connection error:", err);
  process.exit(1);
});