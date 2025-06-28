const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: String,
  price: { type: Number, required: true },
  description: String,
  imageUrl: String, // This will store the path to uploaded image
  stockCount: { type: Number, default: 0 },
  dateAdded: { type: Date, default: Date.now },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand_Profile', required: true }
});

module.exports = mongoose.model('Product', productSchema);
