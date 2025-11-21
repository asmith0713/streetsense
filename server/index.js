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

// Production security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // Cache preflight for 24 hours
};
app.use(cors(corsOptions));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// static uploads folder & data folder (with caching)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true
}));
app.use('/data', express.static(path.join(__dirname, 'data'), {
  maxAge: '1h',
  etag: true
}));

// Enhanced rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

// Routes
const reportsRouter = require('./routes/reports');
const heatRouter = require('./routes/heat');
const authRouter = require('./routes/auth');
const locationsRouter = require('./routes/locations');
const emergencyRouter = require('./routes/emergency');

app.use('/api/reports/heat', heatRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/auth', authRouter);
app.use('/api/locations', locationsRouter); // User locations for safety heatmap
app.use('/api/emergency', emergencyRouter); // Emergency alerts and contacts

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

// MongoDB connection configuration with production-grade settings
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000, // Increased from 5s to 30s
  socketTimeoutMS: 45000, // 45 seconds for socket operations
  connectTimeoutMS: 30000, // 30 seconds for initial connection
  maxPoolSize: 10, // Connection pool size
  minPoolSize: 2, // Minimum connections
  maxIdleTimeMS: 30000, // Close idle connections after 30s
  retryWrites: true, // Retry failed writes
  retryReads: true, // Retry failed reads
  heartbeatFrequencyMS: 10000, // Check connection health every 10s
  // serverSelectionRetryFrequency: 5000, // Retry server selection every 5s
};

async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
    console.log('MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    return false;
  }
}

async function start() {
  try {
    // Connect to MongoDB with retry logic
    const connected = await connectToMongoDB();
    
    if (!connected) {
      console.error('Failed to connect to MongoDB. Retrying in 5 seconds...');
      setTimeout(start, 5000);
      return;
    }
    
    // Handle MongoDB connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Will auto-reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });
    
    mongoose.connection.on('close', () => {
      console.warn('MongoDB connection closed');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down gracefully...');
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    });
    
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down...');
      try {
        await mongoose.connection.close();
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    });
    
    // Start Express server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
    
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

start();