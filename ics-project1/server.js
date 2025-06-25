const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

let users; // MongoDB collection reference

// MongoDB Connection
MongoClient.connect(process.env.MONGO_URI, { useNewUrlParser: true })
  .then(client => {
    const db = client.db('artify'); // change to your DB name
    users = db.collection('users');
    console.log('✅ Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => console.error('❌ MongoDB connection failed:', err));

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
