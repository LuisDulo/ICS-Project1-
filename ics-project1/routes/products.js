const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const slugify = require('slugify');

function isLoggedIn(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}



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
router.get('/upload', isLoggedIn, (req, res) => {
  const currentUser = req.session.user;
  res.render('uploadProduct', { brandId: currentUser._id }); // pass brandId from session
});


// Handle form submit
// Handle form submit
router.post('/upload', isLoggedIn, upload.single('productImage'), async (req, res) => {
  try {
    const { title, category, price, description, stockCount } = req.body;
    const currentUser = req.session.user;
    console.log("👤 Current user session:", currentUser);


    const slug = slugify(title, { lower: true, strict: true });

    const newProduct = new Product({
  title,
  slug,
  category,
  price,
  description,
  stockCount,
  brandId: currentUser._id,   // OK
  artist: currentUser._id,    // ✅ FIXED: now using ObjectId as required
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
