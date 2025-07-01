const mongoose = require('mongoose');

const artworkSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: String,
  price: { type: Number, required: true },
  description: String,
  stockCount: Number,
  artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: String,
  createdAt: { type: Date, default: Date.now },
  ratings: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, stars: Number }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
  
});

module.exports = mongoose.model('Artwork', artworkSchema);

