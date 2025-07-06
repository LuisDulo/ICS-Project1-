const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const slugify = require('slugify'); // make sure to install: npm i slugify
const Product = require('./models/Product');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const session = require('express-session');
const DesignerJob = require('./models/DesignerJob'); 
const mpesaRoutes = require('./routes/mpesa');
const isProduction = process.env.NODE_ENV === 'production';
const MongoStore = require('connect-mongo');
const http = require('http');
const socketIo = require('socket.io');
const Message = require('./models/message'); // add this at top



const mongoose = require('mongoose');
mongoose.set('strictQuery', true); 
require('dotenv').config();

const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;
const productRoutes = require('./routes/products');
const artworkRoutes = require('./routes/artwork');


// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-ngrok-url.ngrok-free.app'], // replace with your actual ngrok link
  credentials: true
}));


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
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"], // ✅ Add this line
      imgSrc: ["'self'", "https:", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
      connectSrc: ["'self'", "https:"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"]
    },
  })
);



const sessionMiddleware = session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 60 * 60
  }),
  cookie: {
    maxAge: 60 * 60 * 1000,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction
  }
});

// Makes the user available in all EJS templates as currentUser
app.use(sessionMiddleware);

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


const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));








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
const messageRoutes = require('./routes/messages')(users);
const userSocketMap = {}; // username => socket.id
const messagesCollection = db.collection('messages');

//routes
app.get('/session-check', (req, res) => {
  if (req.session.user) {
    res.send(`✅ Logged in as: ${req.session.user.username}`);
  } else {
    res.send('❌ No session found');
  }
});

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
  app.use('/', mpesaRoutes);
  app.use('/messages', messageRoutes);
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
app.get('/user-profile', async (req, res) => {
  try {
    if (!req.session.user) return res.redirect('/login');

    const sessionUsername = req.session.user.username;

    const user = await users.findOne({ username: sessionUsername });

    if (!user) return res.status(404).send('User not found');

    const artworks = await Product.find({ artist: user._id });

    const profileData = {
      name: user.name || sessionUsername,
      username: sessionUsername,
      email: user.email,
      bio: user.bio || "This artist hasn't added a bio yet.",
      avatar: user.profilePicture || `https://i.pravatar.cc/150?u=${sessionUsername}`,
      dateJoined: user.dateJoined?.toDateString() || "N/A",
      followers: user.followers?.length || 0,
      following: user.following?.length || 0,
      artworks
    };

    res.render('userProfile', { user: profileData });

  } catch (err) {
    console.error('❌ Error loading user profile:', err);
    res.status(500).send('Server Error');
  }
});

app.get('/profile/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const viewer = req.session.user; // currently logged-in user

    const user = await users.findOne({ username });

    if (!user) return res.status(404).send('User not found');

    const artworks = await Product.find({ artist: user._id });

    let isFollowing = false;
    if (viewer) {
      const currentUser = await users.findOne({ username: viewer.username });

      // Check if the profile owner's ID is in the current user's following list
      isFollowing = (currentUser.following || []).some(f =>
        f.toString() === user._id.toString()
      );
    }

    const profileData = {
      name: user.name || username,
      username,
      email: user.email,
      bio: user.bio || "This artist hasn't added a bio yet.",
      avatar: user.profilePicture || `https://i.pravatar.cc/150?u=${username}`,
      dateJoined: user.dateJoined?.toDateString() || "N/A",
      artworks,
      followers: user.followers || [],
      following: user.following || []
    };

    res.render('publicProfile', {
      user: profileData,
      currentUser: viewer,
      isFollowing // ✅ Pass to template
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading profile");
  }
});
app.post('/follow/:username', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const targetUsername = req.params.username;
    const currentUsername = req.session.user.username;

    if (targetUsername === currentUsername) {
      return res.status(400).send("You can't follow yourself");
    }

    const targetUser = await users.findOne({ username: targetUsername });
    const currentUser = await users.findOne({ username: currentUsername });

    if (!targetUser || !currentUser) {
      return res.status(404).send("User not found");
    }

    const isFollowing = currentUser.following?.some(
      id => id.toString() === targetUser._id.toString()
    );

    if (isFollowing) {
      // Unfollow
      await users.updateOne(
        { _id: currentUser._id },
        { $pull: { following: targetUser._id } }
      );
      await users.updateOne(
        { _id: targetUser._id },
        { $pull: { followers: currentUser._id } }
      );
    } else {
      // Follow
      await users.updateOne(
        { _id: currentUser._id },
        { $addToSet: { following: targetUser._id } }
      );
      await users.updateOne(
        { _id: targetUser._id },
        { $addToSet: { followers: currentUser._id } }
      );
    }

    res.redirect(`/profile/${targetUsername}`);
  } catch (err) {
    console.error("❌ Error in follow route:", err);
    res.status(500).send("Server error");
  }
});


app.get('/chat/:username', isLoggedIn, async (req, res) => {
  const recipientUsername = req.params.username;
  const sender = await users.findOne({ username: req.session.user.username });
  const recipient = await users.findOne({ username: recipientUsername });

  if (!recipient) return res.status(404).send("User not found");

  const Message = require('./models/message');
  const messages = await Message.find({
    $or: [
      { sender: sender._id, recipient: recipient._id },
      { sender: recipient._id, recipient: sender._id }
    ]
  }).sort({ timestamp: 1 });

  res.render('chat', {
    recipient: recipientUsername,
    messages
  });
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
      { name: 'Digital Art', image: '/digital.jpeg' },
      { name: 'Illustration', image: '/illustration.jpeg' },
      { name: 'Photography', image: '/photography.jpeg' }
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


app.get('/artwork/:slug', async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug })
    .populate('brandId')
    .populate('comments')
    .populate('reviews')
    .populate('artist');

  if (!product) {
    return res.status(404).send('Artwork not found');
  }

  res.render('artwork-detail', { product });
});


// GET post job page
app.get('/postJob', (req, res) => {
  res.render('postJob');
});

app.post('/postJob', async (req, res) => {
  // ✅ Require login
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const { name, specialty, description, rate } = req.body;
  console.log("Form data received:", req.body);

  const newDesigner = new DesignerJob({
    name,
    specialty,
    description,
    rate,
    rating: (Math.random() * 2 + 3).toFixed(1),
    reviews: Math.floor(Math.random() * 96 + 5),
    image: `https://api.dicebear.com/8.x/lorelei/svg?seed=${encodeURIComponent(name)}`,
    username: req.session.user.username, // ✅ Save username
    userId: req.session.user._id         // ✅ Save reference to User
  });

  try {
    await newDesigner.save();
    console.log("✅ Saved to DB:", newDesigner);
    res.redirect('/designers');
  } catch (err) {
    console.error("❌ Error saving to DB:", err);
    res.status(500).send(`<h1>Error saving to DB</h1><pre>${err}</pre>`);
  }
});



const Message = require('./models/message'); // Import your message model

io.use((socket, next) => {
  const session = socket.request.session;
  if (session && session.user) {
    socket.username = session.user.username;
    return next();
  }
  return next(new Error("Not authenticated"));
});

io.on('connection', (socket) => {
  console.log('✅ New connection:', socket.username);

  // Map the user to their socket ID
  userSocketMap[socket.username] = socket.id;

  // Handle private message
  socket.on('private-message', async ({ to, message }) => {
    try {
      const sender = await users.findOne({ username: socket.username });
      const recipient = await users.findOne({ username: to });

      if (!sender || !recipient) return;

      // Save message to MongoDB
      const newMessage = new Message({
        sender: sender._id,
        recipient: recipient._id,
        content: message,
      });
      await newMessage.save();

      // Deliver message in real-time
      const targetSocketId = userSocketMap[to];
      if (targetSocketId) {
        io.to(targetSocketId).emit('private-message', {
          from: socket.username,
          message
        });
      }
    } catch (err) {
      console.error("❌ Error saving or sending message:", err);
    }
  });
socket.on('typing', ({ to }) => {
  const targetSocketId = userSocketMap[to];
  if (targetSocketId) {
    io.to(targetSocketId).emit('typing', { from: socket.username });
  }
});

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.username}`);
    delete userSocketMap[socket.username];
  });
});






  // Start server after DB is ready
  server.listen(PORT, () => {
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
      profilePicture: "",
      followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]

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

   req.session.user = {
  _id: user._id,
  username: user.username,
  email: user.email,
  role: user.userRole,
  profilePicture: user.profilePicture
};

req.session.save(err => {
  if (err) {
    console.error("❌ Error saving session:", err);
    return res.status(500).json({ error: 'Session save failed' });
  }

  res.json({ message: 'Login successful' });
});


  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/set-session', (req, res) => {
  req.session.user = { username: 'TestUser' };
  res.send('✅ Session created');
});

app.get('/get-session', (req, res) => {
  if (req.session.user) {
    res.send(`✅ Session user: ${req.session.user.username}`);
  } else {
    res.send('❌ No session found');
  }
});



