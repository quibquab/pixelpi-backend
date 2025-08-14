const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ MongoDB connection error:', err));
}

// Database Schemas
const userSchema = new mongoose.Schema({
  piUserId: { type: String, unique: true, required: true },
  username: String,
  totalEarnings: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const nftSchema = new mongoose.Schema({
  tokenId: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  creator: String, // Pi Network user ID
  owner: String,   // Current owner's Pi Network user ID
  imageUrl: String, // Will store IPFS URL later
  status: { type: String, enum: ['available', 'sold', 'pending'], default: 'available' },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const NFT = mongoose.model('NFT', nftSchema);

// Basic Routes
app.get('/', (req, res) => {
  res.send('PixelPi Backend Working with NFTs!');
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// User Routes
app.get('/api/create-test-user', async (req, res) => {
  try {
    const testUser = new User({
      piUserId: 'test_user_' + Date.now(),
      username: 'TestPhotographer'
    });
    await testUser.save();
    res.json({ 
      success: true, 
      message: 'User created!', 
      user: testUser 
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, users });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// NFT Routes
app.get('/api/create-test-nft', async (req, res) => {
  try {
    const testNFT = new NFT({
      tokenId: 'NFT_' + Date.now(),
      title: 'Beautiful Sunset',
      description: 'A stunning sunset over the mountains',
      price: 15.5,
      category: 'landscape',
      creator: 'test_user_123',
      owner: 'test_user_123',
      imageUrl: 'https://example.com/sunset.jpg'
    });
    await testNFT.save();
    res.json({ 
      success: true, 
      message: 'Test NFT created!', 
      nft: testNFT 
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/nfts', async (req, res) => {
  try {
    const nfts = await NFT.find().sort({ createdAt: -1 });
    res.json({ success: true, nfts });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/nfts/available', async (req, res) => {
  try {
    const nfts = await NFT.find({ status: 'available' }).sort({ createdAt: -1 });
    res.json({ success: true, nfts });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/nfts/:tokenId', async (req, res) => {
  try {
    const nft = await NFT.findOne({ tokenId: req.params.tokenId });
    if (!nft) {
      return res.json({ success: false, error: 'NFT not found' });
    }
    
    // Increment view count
    nft.views += 1;
    await nft.save();
    
    res.json({ success: true, nft });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
