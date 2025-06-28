const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const router = express.Router();
const Product = require('./models/Product');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
mongoose.set('strictQuery', true); // harmless use that also improves query behavior
require('dotenv').config();

const path = require('path');

const app = express();
const PORT = 3000;
const productRoutes = require('./routes/products');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));


let users; // MongoDB collection reference

// MongoDB Connection
// ✅ Connect to MongoDB via Mongoose
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ Connected to MongoDB via Mongoose');

  // Setup MongoClient separately if you still need it for `users`:
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('artify');
  users = db.collection('users');

//routes
  app.use('/', productRoutes);
  router.get('/marketplace', async (req, res) => {
    try {
      const products = await Product.find({});
      res.render('marketplace', { products });
    } catch (err) {
      console.error(err);
      res.status(500).send('Failed to load marketplace');
    }
  });




  // Start server after DB is ready
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// Register Route
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existing = await users.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(400).json({ error: 'Username or email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = {
      username,
      email,
      passwordHash,
      userRole: "Buyer",
      status: "active",
      dateJoined: new Date(),
      profilePicture: ""
    };

    await users.insertOne(newUser);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Login Route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await users.findOne({ username });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ error: 'Incorrect password' });

    res.json({
      message: 'Login successful',
      user: {
        username: user.username,
        email: user.email,
        userRole: user.userRole,
        status: user.status,
        dateJoined: user.dateJoined,
        profilePicture: user.profilePicture
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
  
});