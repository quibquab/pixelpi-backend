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

// Basic routes (same as before)
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🗄️ MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
});
