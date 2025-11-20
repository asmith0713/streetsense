// server/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();
const app = express();

// Trust proxy for rate limiter behind Nginx/Docker
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200.
};
app.use(cors(corsOptions));
app.use(express.json());

// static uploads folder & data folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please slow down.' }
});
app.use('/api/', apiLimiter);

// Routes
const reportsRouter = require('./routes/reports');
const heatRouter = require('./routes/heat');
const authRouter = require('./routes/auth');

app.use('/api/reports/heat', heatRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/auth', authRouter); // New Auth Routes

// basic health
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: 'disconnected'
  };
  
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      health.mongodb = 'connected';
    }
    res.json({ ok: true, ...health });
  } catch (err) {
    health.error = err.message;
    res.status(503).json({ ok: false, ...health });
  }
});


// Validate required environment variables
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET', 'ADMIN_PASSWORD'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
    app.listen(PORT, () => console.log('Server running on', PORT));
  } catch (err) {
    console.error('Startup error', err);
    process.exit(1);
  }
}
start();