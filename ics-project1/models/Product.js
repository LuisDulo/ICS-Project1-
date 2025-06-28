const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: String,
  category: String,
  price: Number,
  description: String,
  stockCount: Number,
  brandId: String,
  imageUrl: String
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
