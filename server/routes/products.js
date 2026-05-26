const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/products — Public: all products with optional filters
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, brand } = req.query;
    const where = {};

    if (category) where.category = category;
    if (brand) where.brand = brand;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { brand: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } }
      ];
    }

    let order = [];
    if (sort === 'price-low') order = [['price', 'ASC']];
    else if (sort === 'price-high') order = [['price', 'DESC']];
    else if (sort === 'rating') order = [['rating', 'DESC']];
    else order = [['createdAt', 'ASC']];

    const products = await Product.findAll({ where, order });
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error fetching products.' });
  }
});

// GET /api/products/:id — Public: single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/products — Admin: add new product
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error creating product.' });
  }
});

// PUT /api/products/:id — Admin: update product
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    await product.update(req.body);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating product.' });
  }
});

// DELETE /api/products/:id — Admin: delete product
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    await product.destroy();
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting product.' });
  }
});

module.exports = router;
