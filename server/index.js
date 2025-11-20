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
app.use(cors());
app.use(express.json());

// static uploads folder & data folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, try later.' }
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
app.get('/health', (req, res) => res.json({ ok: true, now: new Date().toISOString() }));

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log('Server running on', PORT));
  } catch (err) {
    console.error('Startup error', err);
    process.exit(1);
  }
}
start();