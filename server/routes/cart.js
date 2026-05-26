const express = require('express');
const router = express.Router();
const CartItem = require('../models/CartItem');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');

// GET /api/cart — Get current user's cart with product details
router.get('/', protect, async (req, res) => {
  try {
    const cartItems = await CartItem.findAll({
      where: { userId: req.user.id }
    });

    // Attach product details
    const enriched = await Promise.all(
      cartItems.map(async (item) => {
        const product = await Product.findByPk(item.productId);
        return {
          id: item.productId,
          qty: item.qty,
          product
        };
      })
    );

    res.json(enriched.filter(item => item.product));
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error fetching cart.' });
  }
});

// POST /api/cart — Add or update item in cart
router.post('/', protect, async (req, res) => {
  try {
    const { productId, qty = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'productId is required.' });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    let cartItem = await CartItem.findOne({
      where: { userId: req.user.id, productId }
    });

    if (cartItem) {
      cartItem.qty += qty;
      await cartItem.save();
    } else {
      cartItem = await CartItem.create({
        userId: req.user.id,
        productId,
        qty
      });
    }

    res.json({ message: 'Cart updated.', cartItem });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Server error updating cart.' });
  }
});

// PATCH /api/cart/:productId — Update quantity of specific item
router.patch('/:productId', protect, async (req, res) => {
  try {
    const { qty } = req.body;
    const { productId } = req.params;

    if (qty <= 0) {
      await CartItem.destroy({ where: { userId: req.user.id, productId } });
      return res.json({ message: 'Item removed from cart.' });
    }

    const cartItem = await CartItem.findOne({
      where: { userId: req.user.id, productId }
    });

    if (!cartItem) return res.status(404).json({ message: 'Cart item not found.' });

    cartItem.qty = qty;
    await cartItem.save();
    res.json({ message: 'Quantity updated.', cartItem });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/cart/:productId — Remove a specific item
router.delete('/:productId', protect, async (req, res) => {
  try {
    await CartItem.destroy({
      where: { userId: req.user.id, productId: req.params.productId }
    });
    res.json({ message: 'Item removed from cart.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/cart — Clear entire cart
router.delete('/', protect, async (req, res) => {
  try {
    await CartItem.destroy({ where: { userId: req.user.id } });
    res.json({ message: 'Cart cleared.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
