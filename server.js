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
} else {
  console.log('⚠️ No MongoDB URI provided - running without database');
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
  status: { type: String, enum: ['available', 'sold'], default: 'available' },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const NFT = mongoose.model('NFT', nftSchema);// Database Schemas
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
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['available', 'sold'], default: 'available' },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const NFT = mongoose.model('NFT', nftSchema);// Basic routes (same as before)
app.get('/', (req, res) => {
  res.send('PixelPi Backend is Working with MongoDB!');
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'PixelPi API is running!',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend working perfectly!',
    database: mongoose.connection.readyState === 1 ? 'Ready' : 'Not connected'
  });
});

// New database test endpoint
app.get('/api/db-test', (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.json({ 
      success: true, 
      message: 'Database connection successful!',
      database: 'MongoDB Atlas Connected'
    });
  } else {
    res.json({ 
      success: false, 
      message: 'Database not connected',
      database: 'Disconnected'
    });
  }
});
// Test creating a user
app.post('/api/test-user', async (req, res) => {
  try {
    const testUser = new User({
      piUserId: 'test_user_' + Date.now(),
      username: 'TestUser'
    });
    await testUser.save();
    res.json({ success: true, message: 'Test user created!', user: testUser });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🗄️ MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
});
