// server/seed.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const Report = require('./models/Report');

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error('.env MONGO_URI not set');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  await Report.deleteMany({});

  const sample = [
    {
      title: 'Pothole near bus stop',
      description: 'Large pothole fills with water after rains',
      category: 'traffic',
      location: { type: 'Point', coordinates: [78.396, 17.447] },
      timeOfDay: 'day',
      photoUrl: null
    },
    {
      title: 'Dark corner near market',
      description: 'No streetlight working after 10pm',
      category: 'safety',
      location: { type: 'Point', coordinates: [78.397, 17.446] },
      timeOfDay: 'night'
    },
    {
      title: 'Overflowing garbage bin',
      description: 'Garbage bins not emptied for days',
      category: 'garbage',
      location: { type: 'Point', coordinates: [78.395, 17.448] },
      timeOfDay: 'day'
    }
  ];

  await Report.insertMany(sample);
  console.log('Seeded sample reports');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
