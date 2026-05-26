const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const CartItem = require('../models/CartItem');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// POST /api/orders — Place an order
router.post('/', protect, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;

    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({ message: 'Shipping address and payment method are required.' });
    }

    // Fetch user's cart
    const cartItems = await CartItem.findAll({ where: { userId: req.user.id } });
    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    // Enrich cart with product data
    const enriched = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findByPk(item.productId);
        return { id: item.productId, qty: item.qty, product };
      })
    );

    const validItems = enriched.filter(item => item.product);

    // Calculate totals
    const subtotal = validItems.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.qty), 0);
    const shipping = subtotal >= 50 ? 0 : 5;
    const tax = parseFloat((subtotal * 0.05).toFixed(2));
    const total = parseFloat((subtotal + shipping + tax).toFixed(2));

    const orderId = 'ORD' + Date.now();

    const order = await Order.create({
      id: orderId,
      userId: req.user.id,
      items: validItems.map(item => ({
        id: item.id,
        qty: item.qty,
        product: {
          id: item.product.id,
          title: item.product.title,
          brand: item.product.brand,
          price: item.product.price,
          images: item.product.images
        }
      })),
      subtotal: parseFloat(subtotal.toFixed(2)),
      shipping,
      tax,
      total,
      shippingAddress,
      paymentMethod,
      status: 'confirmed'
    });

    // Clear cart after order
    await CartItem.destroy({ where: { userId: req.user.id } });

    res.status(201).json({ message: 'Order placed successfully.', order });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ message: 'Server error placing order.' });
  }
});

// GET /api/orders — Get current user's order history
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/orders/:orderId — Get single order
router.get('/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { id: req.params.orderId, userId: req.user.id }
    });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
