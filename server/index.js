// server/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs'); // Added to check if folders exist

dotenv.config();

// 1. Validate Env Vars EARLY (Fail fast)
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET', 'ADMIN_PASSWORD'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`[Fatal] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// 2. Security & Middleware
app.set('trust proxy', 1); // Trust proxy for rate limiter behind Nginx/Docker

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

const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000','http://192.168.0.102:3000','http://0.0.0.0:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400,
  exposedHeaders: ['x-admin-password'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password']
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Static Files (Ensure directories exist to prevent crashes)
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir, { maxAge: '1d', etag: true }));
app.use('/data', express.static(dataDir, { maxAge: '1h', etag: true }));

// 4. Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

// 5. Routes
// Import routes (Ensure these files exist)
const reportsRouter = require('./routes/reports');
const heatRouter = require('./routes/heat');
const authRouter = require('./routes/auth');
const locationsRouter = require('./routes/locations');
const emergencyRouter = require('./routes/emergency');

// Order matters: Specific routes before general routes
app.use('/api/reports/heat', heatRouter); 
app.use('/api/reports', reportsRouter);
app.use('/api/auth', authRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/emergency', emergencyRouter);

// Serve React App in Production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/build');
  
  // Serve static files from React build
  app.use(express.static(clientBuildPath, {
    maxAge: '1d',
    etag: true,
    index: false // Don't auto-serve index.html here
  }));
  
  // Cache static assets aggressively
  app.use('/static', express.static(path.join(clientBuildPath, 'static'), {
    maxAge: '1y',
    immutable: true
  }));
  
  // Removed SPA routing - backend should not serve frontend files in Docker
}

// Health Check
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: 'disconnected'
  };
  
  try {
    if (mongoose.connection.readyState === 1) {
      // Lightweight check
      await mongoose.connection.db.command({ ping: 1 });
      health.mongodb = 'connected';
    }
    res.json({ ok: true, ...health });
  } catch (err) {
    health.error = err.message;
    res.status(503).json({ ok: false, ...health });
  }
});

// 6. Error Handling (Must be after routes)

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ 
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) 
  });
});

// 7. Database & Server Startup
// Updated Mongoose Options for v6+ (removed deprecated options)
const mongooseOptions = {
  serverSelectionTimeoutMS: 5000, // Fail fast if DB is down (5s)
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  socketTimeoutMS: 45000, 
  // retryWrites and automatic reconnection are default in Mongoose 6+
};

let server;

async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectToMongoDB, 5000);
  }
}

// MongoDB Event Listeners (Define only once)
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err));

// Graceful Shutdown Function
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  if (server) {
    server.close(() => {
      console.log('HTTP Server closed.');
    });
  }

  try {
    await mongoose.connection.close(false);
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

// Initialize
async function start() {
  // Connect to DB
  await connectToMongoDB();
  
  // Start Server
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });

  // Handle Signals
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

start();