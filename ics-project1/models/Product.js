const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  title: String,
  slug: { type: String, unique: true },
  category: String,
  price: Number,
  description: String,
  longDescription: String,
  stockCount: Number,
  brandId: String,
  imageUrl: String,

  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  rating: {
    type: Number,
    default: 0
  },

  reviews: [
  {
    userName: String,
    rating: Number,
    text: String
  }
],
comments: [
  {
    userName: String,
    text: String
  }
]

});

// Auto-generate slug
productSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
