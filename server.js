const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Multer configuration for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// MongoDB Connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ MongoDB connection error:', err));
}

// IPFS Service Class
class IPFSService {
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
  }

  async uploadImage(imageBuffer, filename) {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', imageBuffer, filename);
      
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            pinata_api_key: this.pinataApiKey,
            pinata_secret_api_key: this.pinataSecretKey
          }
        }
      );
      
      return response.data.IpfsHash;
    } catch (error) {
      throw new Error(`IPFS upload failed: ${error.message}`);
    }
  }
}

const ipfsService = new IPFSService();

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
  creator: String,
  owner: String,
  ipfsHash: String, // IPFS image hash
  imageUrl: String, // Full IPFS URL
  status: { type: String, enum: ['available', 'sold', 'pending'], default: 'available' },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const NFT = mongoose.model('NFT', nftSchema);

// Basic Routes
app.get('/', (req, res) => {
  res.send('PixelPi Backend - Real NFT Minting Ready!');
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    ipfs: process.env.PINATA_API_KEY ? 'Configured' : 'Not configured'
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
app.post('/api/nfts/mint', upload.single('image'), async (req, res) => {
  try {
    const { title, description, price, category, creator } = req.body;
    const imageFile = req.file;
    
    if (!imageFile) {
      return res.status(400).json({ error: 'Image file is required' });
    }
    
    if (!title || !description || !price || !category) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Upload image to IPFS
    console.log('Uploading to IPFS...');
    const imageHash = await ipfsService.uploadImage(
      imageFile.buffer, 
      imageFile.originalname
    );
    
    console.log('IPFS upload successful:', imageHash);
    
    // Generate unique token ID
    const tokenId = `NFT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save NFT to database
    const nft = new NFT({
      tokenId,
      title,
      description,
      price: parseFloat(price),
      category,
      creator: creator || 'anonymous',
      owner: creator || 'anonymous',
      ipfsHash: imageHash,
      imageUrl: `https://gateway.pinata.cloud/ipfs/${imageHash}`,
      status: 'available'
    });
    
    await nft.save();
    console.log('NFT saved to database:', tokenId);
    
    res.json({
      success: true,
      message: 'NFT minted successfully!',
      nft: {
        tokenId,
        title,
        description,
        price: parseFloat(price),
        category,
        imageUrl: `https://gateway.pinata.cloud/ipfs/${imageHash}`,
        ipfsHash: imageHash
      }
    });
    
  } catch (error) {
    console.error('Minting error:', error);
    res.status(500).json({ error: error.message });
  }
});

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
    
    nft.views += 1;
    await nft.save();
    
    res.json({ success: true, nft });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 IPFS: ${process.env.PINATA_API_KEY ? 'Ready' : 'Not configured'}`);
});
// Add these routes to your server.js for Pi Network payments

// Simple payment approval (for testing)
app.post('/api/payments/approve', async (req, res) => {
    try {
        const { paymentId, tokenId, buyerId } = req.body;
        
        console.log('Payment approval request:', { paymentId, tokenId, buyerId });
        
        // For testnet, we can approve without full Pi Network verification
        // In production, you'd verify with Pi Network API here
        
        // Check if NFT exists and is available
        const nft = await NFT.findOne({ tokenId: tokenId });
        if (!nft) {
            return res.status(404).json({ error: 'NFT not found' });
        }
        
        if (nft.status !== 'available') {
            return res.status(400).json({ error: 'NFT not available for purchase' });
        }
        
        console.log('Payment approved for NFT:', nft.title);
        
        res.json({
            success: true,
            message: 'Payment approved',
            paymentId: paymentId,
            nft: nft
        });
        
    } catch (error) {
        console.error('Payment approval error:', error);
        res.status(500).json({ 
            error: 'Payment approval failed',
            details: error.message 
        });
    }
});

// Simple payment completion (for testing)
app.post('/api/payments/complete', async (req, res) => {
    try {
        const { paymentId, txid, tokenId, buyerId } = req.body;
        
        console.log('Payment completion request:', { paymentId, txid, tokenId, buyerId });
        
        // Update NFT ownership
        const nft = await NFT.findOneAndUpdate(
            { tokenId: tokenId },
            {
                $set: {
                    owner: buyerId,
                    status: 'sold',
                    soldAt: new Date(),
                    soldPrice: parseFloat(nft.price),
                    transactionId: txid,
                    paymentId: paymentId
                }
            },
            { new: true }
        );
        
        if (!nft) {
            return res.status(404).json({ error: 'NFT not found' });
        }
        
        console.log('NFT ownership transferred:', nft.title, 'to', buyerId);
        
        res.json({
            success: true,
            message: 'NFT purchase completed successfully',
            nft: nft,
            paymentId: paymentId,
            txid: txid
        });
        
    } catch (error) {
        console.error('Payment completion error:', error);
        res.status(500).json({ 
            error: 'Payment completion failed',
            details: error.message 
        });
    }
});
