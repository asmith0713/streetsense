# StreetSense - Production Deployment Guide

## 🚀 Production Features

### Safety & Women's Security
- **Real-time Crowd Heatmap**: Shows where people are located for safety awareness
- **Location Broadcasting**: Users can share their location to create safe zones
- **Active User Count**: Displays how many people are nearby
- **Color-coded Safety Zones**: Green = More people = Safer areas

### Production Security
- ✅ Helmet.js security headers
- ✅ HTTPS enforcement (HSTS)
- ✅ Content Security Policy (CSP)
- ✅ Rate limiting (configurable)
- ✅ CORS whitelisting
- ✅ Input validation & sanitization
- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ File upload restrictions
- ✅ MongoDB injection prevention

### Performance Optimizations
- ✅ Database indexing (geospatial + compound)
- ✅ Auto-expiring location data (TTL indexes)
- ✅ Static asset caching
- ✅ ETag headers
- ✅ Gzip compression
- ✅ Lazy loading
- ✅ API response caching

### Monitoring & Reliability
- ✅ Health check endpoints
- ✅ Docker health checks
- ✅ Auto-restart policies
- ✅ Graceful shutdowns
- ✅ Error logging
- ✅ Connection retry logic

## 📋 Prerequisites

- Docker & Docker Compose
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)
- MongoDB Atlas account (for production DB) OR local MongoDB

## 🛠️ Deployment Steps

### 1. Environment Configuration

Create production `.env` files:

**Server (`server/.env`):**
```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/streetsense?retryWrites=true&w=majority
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_PASSWORD=$(openssl rand -base64 16)
GOOGLE_CLIENT_ID=your-production-google-client-id.apps.googleusercontent.com
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
NODE_ENV=production
RATE_LIMIT_MAX=200
PORT=5000
```

**Client (`client/.env`):**
```bash
REACT_APP_BACKEND_URL=https://api.yourdomain.com
REACT_APP_GOOGLE_CLIENT_ID=your-production-google-client-id.apps.googleusercontent.com
```

### 2. MongoDB Setup

**Option A: MongoDB Atlas (Recommended)**
1. Create free cluster at https://cloud.mongodb.com
2. Whitelist your server IP
3. Create database user
4. Get connection string
5. Replace `MONGO_URI` in `.env`

**Option B: Self-hosted MongoDB**
- Use the Docker Compose MongoDB service
- Ensure data persistence with volumes
- Set up regular backups

### 3. SSL/TLS Configuration

**Using Let's Encrypt (Free):**
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be in: /etc/letsencrypt/live/yourdomain.com/
```

### 4. Nginx Reverse Proxy

Create `/etc/nginx/sites-available/streetsense`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client (React App)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Server
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:5000/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# Rate limit zone
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/streetsense /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Build & Deploy with Docker

```bash
# Clone repository
git clone https://github.com/yourusername/streetsense.git
cd streetsense

# Create production .env files (see step 1)

# Build and start services
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Check health
curl http://localhost:5000/health
```

### 6. Database Indexes (First Run)

Connect to MongoDB and ensure indexes:
```javascript
db.reports.createIndex({ location: "2dsphere" })
db.reports.createIndex({ timestamp: -1, category: 1, status: 1 })
db.userlocations.createIndex({ location: "2dsphere" })
db.userlocations.createIndex({ timestamp: 1 }, { expireAfterSeconds: 300 })
```

### 7. Monitoring Setup

**Docker Health Checks:**
```bash
# Check service health
docker-compose ps

# View health check logs
docker inspect --format='{{json .State.Health}}' streetsense_server_1
```

**Log Monitoring:**
```bash
# Real-time logs
docker-compose logs -f server
docker-compose logs -f client

# Save logs to file
docker-compose logs > deployment.log
```

## 🔧 Production Checklist

### Security
- [ ] Change all default passwords
- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall (UFW)
- [ ] Set up fail2ban
- [ ] Whitelist MongoDB IPs
- [ ] Configure Google OAuth for production domain
- [ ] Set secure CORS origins
- [ ] Enable rate limiting

### Performance
- [ ] Enable Gzip compression in Nginx
- [ ] Set up CDN for static assets (Cloudflare)
- [ ] Configure caching headers
- [ ] Optimize images before upload
- [ ] Set up database backups
- [ ] Monitor server resources

### Maintenance
- [ ] Set up automated backups
- [ ] Configure log rotation
- [ ] Set up monitoring (UptimeRobot, Datadog)
- [ ] Document deployment process
- [ ] Create disaster recovery plan
- [ ] Set up automated SSL renewal

## 🚨 Safety Features Configuration

### Enable Crowd Safety Heatmap

1. Users must enable location tracking
2. Click "Share Location" to broadcast
3. Toggle "Show Safety Map" to see crowd density
4. Green areas = more people = safer zones

### Privacy Settings

Location data automatically expires after 5 minutes for privacy.

Users can opt-out anytime by:
- Disabling "Share Location" toggle
- Stopping location tracking

## 📊 Monitoring URLs

- **Server Health**: `https://api.yourdomain.com/health`
- **API Stats**: `https://api.yourdomain.com/api/locations/stats`
- **Active Users**: Check crowd heatmap legend

## 🔄 Updates & Maintenance

```bash
# Pull latest code
git pull origin main

# Rebuild containers
docker-compose down
docker-compose up -d --build

# Clean up old images
docker system prune -a
```

## 🆘 Troubleshooting

### Server won't start
```bash
docker-compose logs server
# Check MONGO_URI, JWT_SECRET are set
```

### Can't connect to MongoDB
```bash
# Test connection
docker exec -it streetsense_mongo_1 mongosh
```

### CORS errors
```bash
# Verify CORS_ORIGIN in server/.env matches your domain
# Add multiple origins comma-separated
```

### Location tracking not working
```bash
# Ensure HTTPS is enabled (geolocation requires secure context)
# Check browser console for permission errors
```

## 📞 Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/streetsense/issues
- Email: support@yourdomain.com

## 📝 License

MIT License - See LICENSE file for details
