const mongoose = require('mongoose');

const DesignerJobSchema = new mongoose.Schema({
  name: String,
  specialty: String,
  description: String,
  rate: Number,
  rating: Number,
  reviews: Number,
  image: String,
  username: String, // ✅ store who posted this
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // if you have a User model
  }
});

module.exports = mongoose.model('DesignerJob', DesignerJobSchema);
