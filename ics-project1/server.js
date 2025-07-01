const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const Product = require('./models/Product');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const session = require('express-session');
const DesignerJob = require('./models/DesignerJob'); 


const mongoose = require('mongoose');
mongoose.set('strictQuery', true); 
require('dotenv').config();

const path = require('path');

const app = express();
const PORT = 3000;
const productRoutes = require('./routes/products');
const artworkRoutes = require('./routes/artwork');


// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "https:", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
      connectSrc: ["'self'", "https:"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"]
    },
  })
);
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false
}));
// Makes the user available in all EJS templates as currentUser
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});
function isLoggedIn(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}










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
app.get('/register', (req, res) => {
  res.render('register');
});
app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/user/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const user = await users.findOne({ username });
    console.log("👉 Checking for username:", username);
console.log("🔍 Found user:", user);


    if (!user) return res.status(404).send('User not found');

    // Inject placeholder fields if not already in DB
    const profileData = {
      name: user.name || user.username,
      username: user.username,
      bio: user.bio || "Digital artist and creator",
      avatar: user.profilePicture || "https://i.pravatar.cc/150?u=" + user.username,
      followers: user.followers || 128,
      following: user.following || 87,
      projects: user.projects || 12,
      posts: user.posts || 42,
      showcasedArtworks: user.showcasedArtworks || [
        { title: "Dreamscape", image: "/echoes.jpeg" },
        { title: "Serenity", image: "/tree.jpeg" }
      ],
      collaborations: user.collaborations || [
        "https://upload.wikimedia.org/wikipedia/commons/a/ab/Logo_TV_2022.png",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Creative-Commons-Logo.svg/1024px-Creative-Commons-Logo.svg.png"
      ],
      purchased: user.purchased || [
        { name: "Galaxy Pack", seller: "NovaArtist", price: 45, image: "/Neo.jpg" },
        { name: "Mystic Pack", seller: "ArtbyRay", price: 30, image: "/tree.jpeg" }
      ],
      activity: user.activity || [
        { type: 'like', user: 'Jay', artwork: 'Dreamscape', time: '2h ago' },
        { type: 'comment', user: 'Luna', artwork: 'Serenity', comment: 'Love this piece!', time: '5h ago' },
        { type: 'upload', user: user.username, artwork: 'Galaxy Journey', time: '1d ago' }
      ]
    };

    res.render('userProfile', { user: profileData });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading user profile');
  }
});

  app.use('/', productRoutes);
  app.use('/', artworkRoutes);
  app.get('/marketplace', async (req, res) => {
    try {
      const products = await Product.find({});
      res.render('marketplace', { products });
    } catch (err) {
      console.error(err);
      res.status(500).send('Failed to load marketplace');
    }
  });
  app.get('/designers', async (req, res) => {
  try {
    const artists = await DesignerJob.find({});
    const featured = artists.slice(0, 2); // or use logic to pick actual featured designers

    res.render('designers', { artists, featured });
  } catch (err) {
    console.error("Error fetching designers:", err);
    res.status(500).send("Error loading designers");
  }
});

app.get('/home', async (req, res) => {
  try {
    const artworks = [
      { title: 'Echoes of Creation', artist: 'Aura Bloom', price: 45, image: '/echoes.jpeg' },
      { title: 'Neon Metropolis', artist: 'CyberFlow', price: 72, image: '/Neo.jpg' },
      { title: 'Whispering Woods', artist: 'Luna Sketch', price: 55, image: '/tree.jpeg' }
    ];

    // Check if `users` is defined
    if (!users) {
      console.error('❌ "users" collection is undefined');
      return res.status(500).send('Users collection not available');
    }

    const popularArtists = await users
      .find({}, { projection: { username: 1, profilePicture: 1, _id: 0 } })
      .limit(3)
      .toArray();

    const finalArtists = popularArtists.map((u, i) => ({
      name: u.username,
      image: u.profilePicture || `https://i.pravatar.cc/150?img=${i + 10}`
    }));

    const categories = [
      { name: 'Digital Art', image: 'https://source.unsplash.com/400x300/?digital,art' },
      { name: 'Illustration', image: 'https://source.unsplash.com/400x300/?illustration' },
      { name: 'Photography', image: 'https://source.unsplash.com/400x300/?photography,camera' }
    ];

    res.render('home', { artworks, popularArtists: finalArtists, categories });
  } catch (err) {
    console.error('❌ Error in /home route:', err);
    res.status(500).send('Failed to load home page');
  }
});
app.get('/canvas', (req, res) => {
  res.render('canvas');
});
console.log("✅ /user/:username route registered");
// GET: Artwork detail page
app.get('/artwork/:id', async (req, res) => {
  try {
    const artworkId = req.params.id;
    const artwork = await Product.findById(artworkId).lean();

    if (!artwork) return res.status(404).send('Artwork not found');

    res.render('artworkDetail', { artwork });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading artwork');
  }
});
// GET post job page
app.get('/postJob', (req, res) => {
  res.render('postJob');
});

app.post('/postJob', async (req, res) => {
  const { name, specialty, description, rate } = req.body;
  console.log("Form data received:", req.body); // <-- DEBUG

  const newDesigner = new DesignerJob({
    name,
    specialty,
    description,
    rate,
    rating: (Math.random() * 2 + 3).toFixed(1),
    reviews: Math.floor(Math.random() * 96 + 5),
    image: `https://api.dicebear.com/8.x/lorelei/svg?seed=${encodeURIComponent(name)}`
  });

  try {
    await newDesigner.save();
    console.log("Saved to DB:", newDesigner); // <-- DEBUG
    res.redirect('/designers');
  } catch (err) {
    console.error("Error saving to DB:", err);
    res.status(500).send(`<h1>Error saving to DB</h1><pre>${err}</pre>`);

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


app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await users.findOne({ username });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ error: 'Incorrect password' });

    // ✅ Store user data in the session
    req.session.user = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.userRole,
      profilePicture: user.profilePicture
    };

    res.json({ message: 'Login successful' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});