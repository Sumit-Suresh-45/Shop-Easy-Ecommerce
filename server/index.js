require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB, sequelize } = require('./config/db');

// Import models (to register them with Sequelize)
require('./models/User');
require('./models/Product');
require('./models/CartItem');
require('./models/Order');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the frontend static files from project root
app.use(express.static(path.join(__dirname, '..')));

// Serve admin panel
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// ─── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ShopEasy API is running 🚀' });
});

// ─── Serve frontend for any non-API route ─────────────────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  }
});

// ─── Start Server ─────────────────────────────────────────────
const startServer = async () => {
  await connectDB();

  // Sync all models (create tables if not exist)
  await sequelize.sync({ alter: true });
  console.log('✅ Database tables synced.');

  app.listen(PORT, () => {
    console.log(`\n🚀 ShopEasy Server running at http://localhost:${PORT}`);
    console.log(`📦 API available at   http://localhost:${PORT}/api`);
    console.log(`🛠️  Admin Panel at     http://localhost:${PORT}/admin\n`);
  });
};

startServer();
