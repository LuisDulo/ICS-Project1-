const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');

// Ensure upload folder exists
const uploadPath = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Show the form
router.get('/upload', (req, res) => {
  const dummyBrandId = '60d5f9e2c4b9b81234abcdef'; // Dummy ID
  res.render('uploadProduct', { brandId: dummyBrandId });
});

// Handle form submit
router.post('/upload', upload.single('productImage'), async (req, res) => {
  try {
    console.log('File:', req.file); // DEBUG
    console.log('Body:', req.body); // DEBUG

    const { title, category, price, description, stockCount, brandId } = req.body;

    const newProduct = new Product({
      title,
      category,
      price,
      description,
      stockCount,
      brandId,
      imageUrl: '/uploads/' + req.file.filename
    });

    await newProduct.save();
    res.send('✅ Product uploaded successfully!');
  } catch (err) {
  console.error('❌ Upload Error:', err);
  res.status(500).send(`Error uploading product: ${err.message}`);
}


});


module.exports = router;
