# StreetSense - Civic Issue Reporting & Women's Safety Platform

A full-stack web application for reporting civic issues and enhancing women's safety through real-time crowd density mapping. Know where people are for safer navigation.

## Team

This project was developed by:

- **Asmith Maramreddy** - [@asmith0713](https://github.com/asmith0713)
- **Niteesh Reddy Kancharla** - [niteesh206](https://github.com/niteesh206)

## 🛡️ Safety Features (Women's Safety Focus)

- 👥 **Real-time Crowd Heatmap** - See where people are located for safer route planning
- 🟢 **Safety Zones** - Green areas indicate more people = safer areas
- 📍 **Location Broadcasting** - Opt-in to share your location and help create safe zones
- 📊 **Active User Count** - Know how many people are nearby in real-time
- 🔒 **Privacy First** - Location data auto-expires after 5 minutes
- 🚨 **Safety Reports** - Report safety concerns and hazards with geolocation

**Use Case**: Women can check the crowd heatmap before walking alone. Green areas show where more people are present, indicating safer routes.

## Features

- 🗺️ **Interactive Map** - Report issues by clicking on the map
- 🔥 **Issue Heat Maps** - Visualize problem density
- 📊 **Clustering** - View grouped reports for better overview
- 👍 **Community Upvoting** - Validate important issues
- 🛡️ **Admin Panel** - Moderate and track issue resolution
- 📱 **Responsive Design** - Works on all devices
- 🔐 **User Authentication** - Email/password + Google OAuth sign-in
- 🔗 **Location Sharing** - Share your location via link
- 📍 **Live Tracking** - Real-time location tracking with "Find Me" feature
- ⚡ **Production Ready** - Security hardened with rate limiting, HTTPS, and monitoring

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
- Google OAuth 2.0
- Multer (File uploads)
- bcrypt (Password hashing)
- Rate limiting & Helmet (Security)

docker-compose up -d
## Quick Start (Docker Compose)

The recommended way to run StreetSense (locally or on a VM) is via Docker Compose. Everything—frontend, backend, Caddy reverse proxy—is wired up for you.

### 1. Prerequisites
- Git
- Docker Engine + Docker Compose plugin (or `docker compose` v2)
- A MongoDB connection string (Atlas or self-hosted)
- Optional: A domain pointing to your VM so Caddy can issue HTTPS certificates automatically

### 2. Clone & Configure
```bash
git clone <repo-url>
cd streetsense
cp .env.example .env
```

Edit `.env` with real values:

| Variable | Description |
| --- | --- |
| `MONGO_URI` | Atlas or self-hosted Mongo connection string |
| `JWT_SECRET` | Long random string for API auth |
| `ADMIN_PASSWORD` | Password for `/admin` panel |
| `GOOGLE_CLIENT_ID` & `REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth client (same value) |
| `PUBLIC_HOST` | Public domain or IP served by Caddy (no protocol) |
| `BACKEND_PUBLIC_URL` | Full URL the backend advertises (e.g. `https://street-sense.app`) |
| `REACT_APP_BACKEND_URL` | Same URL for the React build |
| `CORS_ORIGIN` | Comma-separated origins allowed to call the API |

> `.env` is gitignored—keep the real secrets here only.

### 3. Launch the stack
```bash
docker compose pull        # optional, grab latest images
docker compose up -d       # start frontend, backend, Caddy
docker compose logs -f     # tail logs during first boot
```

- Backend health check: `curl https://<PUBLIC_HOST>/api/health`
- Frontend: visit `https://<PUBLIC_HOST>` (or `http://localhost:8080` if testing locally)

### 4. DNS & HTTPS (production)
1. Point your domain’s A (and optional `www`) record to the VM’s public IP.
2. Ensure ports 80/443 are open through the VM firewall and cloud firewall.
3. Caddy reads `PUBLIC_HOST` and automatically issues Let’s Encrypt certificates on first request.

### 5. Common Docker Tasks
```bash
docker compose ps                 # show container status
docker compose logs -f backend    # tail backend logs
docker compose restart frontend   # restart a single service
docker compose down               # stop/remove containers
docker compose down -v            # stop and remove volumes (wipes uploads!)
```

### 6. Local Development (optional)
If you prefer the classic dev workflow (separate servers):
1. Install dependencies under `server/` and `client/` via `npm install`.
2. Start MongoDB locally.
3. Run `npm start` in both `server` and `client` folders.
4. Update `.env` files accordingly (`REACT_APP_BACKEND_URL=http://localhost:5000`).

The Docker stack remains the authoritative way to deploy to test/prod.

## 🛡️ Using Safety Features

### For Women & Safety-Conscious Users

**Step 1: Enable Location**
1. Open the map at http://localhost:3000/map
2. Click the "Find Me" button (📍 crosshair icon) or "Live Tracking"
3. Allow browser location permission

**Step 2: View Safety Heatmap**
1. Click the green "Show Safety Map" button (top controls)
2. The map now shows crowd density with color coding:
   - 🟢 **Green**: High crowd density = Safer areas
   - 🟡 **Yellow**: Medium crowd density
   - 🔵 **Blue**: Low crowd density = Less safe
3. Check the legend for active user count

**Step 3: Contribute to Safety (Optional)**
1. Click "Share Location" button (when location is enabled)
2. Your anonymous location is broadcast to help others
3. You're now contributing to the safety heatmap!
4. Your location auto-expires after 5 minutes for privacy

**Step 4: Plan Safe Routes**
- Look for green zones when planning your walk
- Avoid dark/blue areas when alone
- Share your location with friends using the share button

### Privacy & Security
- ✅ Your location is **anonymous** (no personal data)
- ✅ Data **auto-deletes** after 5 minutes
- ✅ You can **opt-out** anytime
- ✅ **No tracking** when you stop broadcasting
- ✅ Works on **HTTPS only** for security

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

### User Locations (Safety Feature)
- `POST /api/locations` - Update user location for crowd heatmap (requires auth)
- `GET /api/locations/heatmap` - Get crowd density heatmap data
- `GET /api/locations/stats` - Get active user statistics
- `DELETE /api/locations/mine` - Remove your location from map (requires auth)

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

## 🚀 Production Deployment

For detailed production deployment instructions including:
- SSL/TLS configuration
- Nginx reverse proxy setup
- MongoDB Atlas configuration
- Docker Compose production settings
- Security hardening
- Monitoring & health checks



### Quick Production Checklist
- ✅ Use MongoDB Atlas or secure MongoDB instance
- ✅ Enable HTTPS with Let's Encrypt
- ✅ Set strong JWT_SECRET (32+ characters)
- ✅ Configure CORS for production domain
- ✅ Set up Google OAuth for production
- ✅ Enable rate limiting (configured)
- ✅ Set up automated backups
- ✅ Configure monitoring (health endpoints included)
- ✅ Use environment variables (never commit .env)

## Security Notes

⚠️ **Production Security Features:**

- ✅ Helmet.js security headers
- ✅ HTTPS enforcement (HSTS)
- ✅ Content Security Policy
- ✅ Rate limiting (100 requests/15min by default)
- ✅ Input validation & sanitization
- ✅ JWT authentication with secure secrets
- ✅ Password hashing with bcrypt
- ✅ MongoDB injection prevention
- ✅ File upload restrictions (5MB, images only)
- ✅ Geospatial data privacy (auto-expires after 5 min)

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

**Built with ❤️ for better civic engagement and women's safety**

*Empowering communities through technology. Know where people are, feel safer together.*
