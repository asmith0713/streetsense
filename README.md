# StreetSense - Civic Issue Reporting Platform

A full-stack web application for reporting and tracking civic issues like potholes, garbage, and safety hazards with real-time mapping, heatmaps, and community upvoting.

## Team

This project was developed by:

- **[Your Name]** - [@asmith0713](https://github.com/asmith0713)
- **[Friend's Name]** - [GitHub/LinkedIn Profile]

*A collaborative project for Hack This Fest*

## Features

- 🗺️ **Interactive Map** - Report issues by clicking on the map
- 🔥 **Heat Maps** - Visualize problem density
- 📊 **Clustering** - View grouped reports for better overview
- 👍 **Community Upvoting** - Validate important issues
- 🛡️ **Admin Panel** - Moderate and track issue resolution
- 📱 **Responsive Design** - Works on all devices
- 🔐 **User Authentication** - Secure login/register system

## Tech Stack

**Frontend:**
- React 19.2
- React Router v6
- Leaflet & React-Leaflet (Maps)
- Leaflet.heat (Heatmaps)
- Leaflet.markercluster (Clustering)
- Bootstrap 5
- Axios

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Multer (File uploads)
- bcrypt (Password hashing)
- Rate limiting & Helmet (Security)

## Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
cd /home/asmith/LOM/Hack\ This\ Fest/streetsense
```

2. **Configure Environment Variables**

Copy the example env file:
```bash
cp .env.example server/.env
```

Edit `server/.env` with your values:
```env
MONGO_URI=mongodb://localhost:27017/streetsense
JWT_SECRET=your-long-random-secret-key
ADMIN_PASSWORD=your-admin-password
CORS_ORIGIN=http://localhost:3000
```

3. **Install Server Dependencies**
```bash
cd server
npm install
```

4. **Install Client Dependencies**
```bash
cd ../client
npm install
```

### Running in Development

**Terminal 1 - Start MongoDB** (if running locally):
```bash
mongod
```

**Terminal 2 - Start Server:**
```bash
cd server
npm start
```
Server runs on `http://localhost:5000`

**Terminal 3 - Start Client:**
```bash
cd client
npm start
```
Client runs on `http://localhost:3000`

### Running with Docker

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# Stop services
docker-compose down
```

Access:
- Client: `http://localhost:5173`
- Server: `http://localhost:5000`
- MongoDB: `localhost:27017`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Reports
- `GET /api/reports` - Get all reports (with filters)
- `POST /api/reports` - Create new report (requires auth)
- `POST /api/reports/:id/upvote` - Upvote report (requires auth)
- `PUT /api/reports/:id/status` - Update status (requires auth)
- `GET /api/reports/heat` - Get heatmap data

### Admin
- `HEAD /api/reports/export` - Check admin auth
- `POST /api/reports/export` - Export reports as CSV (requires admin password)

### Query Parameters for Reports
- `categories` - Filter by category (comma-separated)
- `since` - Filter by timestamp (ISO date)
- `limit` - Limit results (max 2000)
- `bbox` - Bounding box filter: `lng1,lat1,lng2,lat2`

## Usage Guide

### For Citizens

1. **Create Account**
   - Navigate to `/auth`
   - Register with email and password (min 6 chars)

2. **Report an Issue**
   - Go to `/map`
   - Click on the map or use your location
   - Fill out the form (title, category, description, photo)
   - Submit

3. **View Reports**
   - Toggle between Pins, Heat, or Cluster views
   - Filter by category and time range
   - Click markers to see details and upvote

### For Admins

1. **Access Admin Panel**
   - Navigate to `/admin`
   - Enter admin password (from `.env` file)

2. **Moderate Reports**
   - View all submitted reports
   - Update status: Open → Verified → Resolved
   - Filter and export data as CSV

## Project Structure

```
streetsense/
├── client/                 # React frontend
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── api.js         # Axios config
│   │   ├── constants.js   # App constants
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Route pages
│   │   └── utils/         # Utility functions
│   └── Dockerfile
│
├── server/                # Express backend
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API routes
│   ├── middleware/        # Auth middleware
│   ├── uploads/           # File uploads
│   ├── index.js           # Server entry
│   └── Dockerfile
│
└── docker-compose.yml     # Docker orchestration
```

## Troubleshooting

### Common Issues

**1. MongoDB Connection Error**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Make sure MongoDB is running. Start with `mongod` or check your connection string.

**2. CORS Errors**
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:** Verify `CORS_ORIGIN` in server `.env` matches your client URL.

**3. Authentication Fails**
```
401 Unauthorized
```
**Solution:** 
- Check JWT_SECRET is set in server `.env`
- Clear browser localStorage and re-login
- Verify token is being sent in Authorization header

**4. Images Not Loading**
```
404 on /uploads/...
```
**Solution:**
- Ensure `server/uploads` directory exists
- Check file permissions
- Verify `photoUrl` paths in database

**5. Port Already in Use**
```
Error: listen EADDRINUSE :::5000
```
**Solution:** Kill the process using the port:
```bash
# Find process
lsof -i :5000

# Kill it
kill -9 <PID>
```

### Development Tips

- Use `console.log` in server routes to debug API calls
- Check browser DevTools Network tab for failed requests
- MongoDB Compass is great for viewing database state
- Use React DevTools to inspect component state

## Security Notes

⚠️ **Before deploying to production:**

1. Change all default passwords
2. Use strong, random JWT_SECRET
3. Enable HTTPS
4. Set up proper CORS origins
5. Use environment-specific configs
6. Enable rate limiting (already configured)
7. Review and sanitize user inputs
8. Set up MongoDB authentication

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use for your projects!

## Support

For issues, questions, or contributions, please open an issue on the repository.

---

Built with ❤️ for better civic engagement
