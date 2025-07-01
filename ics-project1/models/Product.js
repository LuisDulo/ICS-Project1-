const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: String,
  category: String,
  price: Number,
  description: String,
  stockCount: Number,
  brandId: String,          // Could also be used as artistId if you store artist profiles separately
  imageUrl: String,

  // 🔽 New fields you need:
  longDescription: String,  // More detailed description (optional)
  artist: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',  // Assuming your user model is called 'User'
  required: true
},

  rating: {
    type: Number,
    default: 0
  },
  comments: [               // Array of comments for the artwork
    {
      user: String,         // Username or user ID
      text: String,
      date: { type: Date, default: Date.now }
    }
  ]
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
