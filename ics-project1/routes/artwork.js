const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET single artwork by slug
router.get('/artwork/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate('brandId') // artist info
      .populate('comments')
      .populate('reviews');

    if (!product) {
      return res.status(404).send('Artwork not found');
    }

    res.render('artwork-detail', { product });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading artwork');
  }
});

// POST review and/or comment
// Place this at the bottom of routes/artwork.js
router.post('/artwork/:slug/review', async (req, res) => {
  const { rating, reviewText, commentText } = req.body;
  const { slug } = req.params;
  const user = req.session.user;

  try {
    const product = await Product.findOne({ slug });
    if (!product) return res.status(404).send('Artwork not found');

    if (rating && reviewText) {
      product.reviews.push({
        userName: user.username,
        rating,
        text: reviewText,
      });
    }

    if (commentText) {
      product.comments.push({
        userName: user.username,
        text: commentText,
      });
    }

    await product.save();
    res.redirect(`/artwork/${slug}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error submitting feedback');
  }
});


module.exports = router;
