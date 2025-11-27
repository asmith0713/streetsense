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
    },
    { title: 'Dark street with no lighting', description: 'Street lights not working for 2 weeks, very unsafe at night', category: 'safety', location: { type: 'Point', coordinates: [78.4867, 17.3850] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=400' },
    { title: 'Broken footpath near school', description: 'Children walking on the road due to broken sidewalk', category: 'safety', location: { type: 'Point', coordinates: [78.4467, 17.4239] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400' },
    { title: 'Unsafe park at night', description: 'Park has no security or lighting after sunset', category: 'safety', location: { type: 'Point', coordinates: [78.4744, 17.4065] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400' },
    { title: 'Abandoned construction site', description: 'Open pit with no barricades, dangerous for kids', category: 'safety', location: { type: 'Point', coordinates: [78.3808, 17.4435] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400' },
    { title: 'Poorly lit bus stop', description: 'Women feel unsafe waiting here after 8pm', category: 'safety', location: { type: 'Point', coordinates: [78.4983, 17.4374] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400' },
    { title: 'Broken street light cluster', description: 'Entire street dark, multiple accidents reported', category: 'safety', location: { type: 'Point', coordinates: [78.4511, 17.4126] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400' },
    { title: 'Dimly lit alley', description: 'Shortcut route unsafe for pedestrians at night', category: 'safety', location: { type: 'Point', coordinates: [78.3894, 17.4485] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1495177977036-37f885148097?w=400' },

    // Traffic Issues
    { title: 'Large pothole on main road', description: 'Pothole causing accidents, needs immediate repair', category: 'traffic', location: { type: 'Point', coordinates: [78.4867, 17.3850] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400' },
    { title: 'Traffic signal not working', description: 'Signal at major junction malfunctioning for 3 days', category: 'traffic', location: { type: 'Point', coordinates: [78.4744, 17.4239] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400' },
    { title: 'Road flooding during rain', description: 'Poor drainage causes 2 feet water accumulation', category: 'water', location: { type: 'Point', coordinates: [78.4588, 17.4372] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400' },
    { title: 'Damaged speed breaker', description: 'Speed breaker broken into pieces, dangerous for bikes', category: 'traffic', location: { type: 'Point', coordinates: [78.3702, 17.4311] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400' },
    { title: 'Missing road signs', description: 'No directional signs after road widening work', category: 'traffic', location: { type: 'Point', coordinates: [78.4911, 17.4482] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b?w=400' },
    { title: 'Illegal parking blocking road', description: 'Vehicles parked on both sides causing traffic jam', category: 'traffic', location: { type: 'Point', coordinates: [78.4822, 17.4147] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400' },
    { title: 'Cracked road surface', description: 'Multiple cracks developing into potholes', category: 'traffic', location: { type: 'Point', coordinates: [78.3956, 17.4521] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400' },

    // Water Issues
    { title: 'Leaking water pipe', description: 'Municipal water pipe leaking for 5 days, wasting water', category: 'water', location: { type: 'Point', coordinates: [78.4633, 17.4285] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400' },
    { title: 'Broken water tanker', description: 'Public water tap broken, community without water', category: 'water', location: { type: 'Point', coordinates: [78.4411, 17.3912] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
    { title: 'Drainage overflow', description: 'Sewage water overflowing onto street', category: 'water', location: { type: 'Point', coordinates: [78.4789, 17.4456] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1584555684040-bad07f8e3228?w=400' },
    { title: 'Clogged storm drain', description: 'Drain blocked with plastic, water not flowing', category: 'water', location: { type: 'Point', coordinates: [78.3845, 17.4368] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1584555684040-bad07f8e3228?w=400' },
    { title: 'Waterlogging issue', description: 'Stagnant water breeding mosquitoes', category: 'water', location: { type: 'Point', coordinates: [78.4922, 17.4098] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400' },

    // Garbage Issues
    { title: 'Overflowing garbage bins', description: 'Bins not emptied for 4 days, smell unbearable', category: 'garbage', location: { type: 'Point', coordinates: [78.4755, 17.4328] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=400' },
    { title: 'Illegal dumping spot', description: 'People throwing garbage in open plot', category: 'garbage', location: { type: 'Point', coordinates: [78.4522, 17.3987] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=400' },
    { title: 'Broken garbage truck', description: 'Municipal truck not collecting for a week', category: 'garbage', location: { type: 'Point', coordinates: [78.4644, 17.4401] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=400' },
    { title: 'Scattered waste on footpath', description: 'Garbage bags torn by stray dogs', category: 'garbage', location: { type: 'Point', coordinates: [78.3778, 17.4267] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=400' },
    { title: 'Construction debris', description: 'Building waste dumped on public road', category: 'garbage', location: { type: 'Point', coordinates: [78.4866, 17.4189] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=400' },
    { title: 'Plastic waste accumulation', description: 'Plastic bags clogging drainage system', category: 'garbage', location: { type: 'Point', coordinates: [78.4033, 17.4433] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=400' },

    // Noise Issues
    { title: 'Late night construction noise', description: 'Construction work continuing till 2am', category: 'noise', location: { type: 'Point', coordinates: [78.4688, 17.4211] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1581092918484-8313e1f6d5e4?w=400' },
    { title: 'Loud wedding music', description: 'DJ music at 1am violating noise rules', category: 'noise', location: { type: 'Point', coordinates: [78.4444, 17.4055] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400' },
    { title: 'Bar creating disturbance', description: 'Pub customers shouting and honking at midnight', category: 'noise', location: { type: 'Point', coordinates: [78.4811, 17.4367] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400' },
    { title: 'Generator noise all night', description: 'Commercial generator running 24/7', category: 'noise', location: { type: 'Point', coordinates: [78.3867, 17.4298] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400' },
    { title: 'Truck horn pollution', description: 'Heavy vehicles honking continuously at junction', category: 'noise', location: { type: 'Point', coordinates: [78.4733, 17.3944] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400' },

    // Stray Animals
    { title: 'Stray dog menace', description: 'Pack of 8-10 dogs chasing pedestrians and vehicles', category: 'stray', location: { type: 'Point', coordinates: [78.4599, 17.4244] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400' },
    { title: 'Cattle on highway', description: 'Cows roaming freely causing traffic hazard', category: 'stray', location: { type: 'Point', coordinates: [78.4355, 17.4122] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1516728778615-2d590ea1855e?w=400' },
    { title: 'Monkey attacks', description: 'Monkeys snatching food and attacking people', category: 'stray', location: { type: 'Point', coordinates: [78.4711, 17.4478] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=400' },
    { title: 'Stray pigs near school', description: 'Multiple pigs digging garbage near school gate', category: 'stray', location: { type: 'Point', coordinates: [78.3922, 17.4156] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1560781290-7dc94c0f8f4f?w=400' },
    { title: 'Street dogs barking', description: 'Dog pack howling throughout the night', category: 'stray', location: { type: 'Point', coordinates: [78.4800, 17.4089] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400' },

    // Harassment & Safety
    { title: 'Eve-teasing at bus stop', description: 'Group of men harassing women daily at 7pm', category: 'eve-teasing', location: { type: 'Point', coordinates: [78.4666, 17.4333] }, timeOfDay: 'evening', photoUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400' },
    { title: 'Stalking incident', description: 'Man following women from metro station', category: 'stalking', location: { type: 'Point', coordinates: [78.4533, 17.4267] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400' },
    { title: 'Verbal harassment', description: 'Men passing inappropriate comments near college', category: 'harassment', location: { type: 'Point', coordinates: [78.4422, 17.3899] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400' },
    { title: 'Drunk men causing trouble', description: 'Intoxicated group harassing passersby', category: 'harassment', location: { type: 'Point', coordinates: [78.4777, 17.4411] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400' },
    { title: 'Catcalling incident', description: 'Men whistling and shouting at women joggers', category: 'eve-teasing', location: { type: 'Point', coordinates: [78.3889, 17.4389] }, timeOfDay: 'evening', photoUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400' },

    // Additional Mixed Issues
    { title: 'Park vandalism', description: 'Park benches and playground equipment damaged', category: 'other', location: { type: 'Point', coordinates: [78.4655, 17.4178] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400' },
    { title: 'Illegal hoardings', description: 'Large advertisement boards blocking view', category: 'other', location: { type: 'Point', coordinates: [78.4488, 17.4011] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b?w=400' },
    { title: 'Encroachment on footpath', description: 'Shops extending onto pedestrian walkway', category: 'other', location: { type: 'Point', coordinates: [78.4711, 17.4444] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400' },
    { title: 'Manhole without cover', description: 'Open manhole extremely dangerous at night', category: 'safety', location: { type: 'Point', coordinates: [78.3811, 17.4222] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400' },
    { title: 'Electric wire hanging low', description: 'Live wire at head height after storm', category: 'safety', location: { type: 'Point', coordinates: [78.4933, 17.4233] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400' },
    { title: 'Tree blocking road', description: 'Fallen tree branch not removed for 2 days', category: 'traffic', location: { type: 'Point', coordinates: [78.4577, 17.4355] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1545224144-b38cd309ef69?w=400' },
    { title: 'Rats in residential area', description: 'Rat infestation due to nearby garbage dump', category: 'garbage', location: { type: 'Point', coordinates: [78.3956, 17.4088] }, timeOfDay: 'night', photoUrl: 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=400' },
    { title: 'Mosquito breeding', description: 'Stagnant water in construction site', category: 'water', location: { type: 'Point', coordinates: [78.4844, 17.4311] }, timeOfDay: 'day', photoUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400' },
  ];

  await Report.insertMany(sample);
  console.log('Seeded sample reports');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
