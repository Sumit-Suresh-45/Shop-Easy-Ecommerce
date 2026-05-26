const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require login + admin role
router.use(protect, adminOnly);

// GET /api/admin/stats — Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.count({ where: { role: 'user' } });
    const totalProducts = await Product.count();
    const totalOrders = await Order.count();

    const orders = await Order.findAll();
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total), 0);

    const lowStock = await Product.findAll({
      where: { stock: { [Op.lt]: 10 } },
      attributes: ['id', 'title', 'stock', 'category']
    });

    const recentOrders = await Order.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      lowStock,
      recentOrders
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error fetching stats.' });
  }
});

// GET /api/admin/orders — All orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.findAll({
      order: [['createdAt', 'DESC']]
    });

    // Enrich with user info
    const enriched = await Promise.all(
      orders.map(async (order) => {
        const user = await User.findByPk(order.userId, {
          attributes: ['id', 'name', 'email']
        });
        return { ...order.toJSON(), user };
      })
    );

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /api/admin/orders/:id/status — Update order status
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    order.status = status;
    await order.save();

    res.json({ message: 'Order status updated.', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/admin/users — All users
router.get('/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/admin/users/:id — Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin users.' });
    await user.destroy();
    res.json({ message: 'User deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
