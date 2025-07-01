const mongoose = require('mongoose');

const DesignerJobSchema = new mongoose.Schema({
  name: String,
  specialty: String,
  description: String,
  rate: Number,
  rating: Number,
  reviews: Number,
  image: String
});

module.exports = mongoose.model('DesignerJob', DesignerJobSchema);
