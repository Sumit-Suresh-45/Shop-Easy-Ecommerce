const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  description: {
    type: DataTypes.TEXT
  },
  specs: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'products',
  timestamps: true
});

module.exports = Product;
