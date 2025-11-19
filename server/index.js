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

app.use(helmet());
app.use(cors());
app.use(express.json());

// static uploads folder (for demo only)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const heatRouter = require('./routes/heat');
app.use('/api/reports/heat', heatRouter);


// small rate limit: 100 requests per 15 minutes per IP (tweakable)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, try later.' }
});
app.use('/api/', apiLimiter);

// routes
const reportsRouter = require('./routes/reports');
app.use('/api/reports', reportsRouter);

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
