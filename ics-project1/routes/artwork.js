const express = require('express');
const router = express.Router();
const multer = require('multer');
const Artwork = require('../models/artwork');

// Storage config (saves files to /public/uploads/)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });
// Middleware to check if user is logged in

// GET /upload-artwork
router.get('/upload-artwork', (req, res) => {
  if (!req.session.user) return res.redirect('/login'); // Optional auth check
  res.render('uploadArtwork', { user: req.session.user });
});
// POST /upload-artwork
router.post('/upload-artwork', upload.single('image'), async (req, res) => {
  try {
    const { title, category, price, description, stockCount } = req.body;
    const imageUrl = '/uploads/' + req.file.filename;

    // Assuming req.user holds logged-in artist info
    const artistId = req.user._id;

    const newArtwork = new Artwork({
      title,
      category,
      price,
      description,
      stockCount,
      imageUrl,
      artist: artistId
    });

    await newArtwork.save();
    res.redirect('/marketplace');
  } catch (err) {
    console.error('❌ Upload failed:', err);
    res.status(500).send('Upload failed');
  }
});
module.exports = router;