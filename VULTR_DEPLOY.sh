#!/bin/bash

# StreetSense Complete Vultr Deployment Script
# Run this script on your Vultr server after SSHing in as root
# Usage: curl -sSL https://raw.githubusercontent.com/asmith0713/streetsense/main/VULTR_DEPLOY.sh | bash
# Or copy/paste this entire script into your terminal

set -e

echo "=========================================="
echo "  StreetSense Vultr Deployment"
echo "=========================================="

# Configuration - Update these values
SERVER_IP="139.84.208.39"
DOMAIN="${SERVER_IP}.nip.io"
REPO_URL="https://github.com/asmith0713/streetsense.git"

# MongoDB Atlas
MONGO_URI="mongodb+srv://maramreddy0713_db_user:dgVIor8Yjfsonxu4@cluster0.jumzcvr.mongodb.net/streetsense"

# Secrets
JWT_SECRET="niteeshlovessumaiyabutshedoesnt"
ADMIN_PASSWORD="12qwaszx@A"
GOOGLE_CLIENT_ID="236637181211-66567rahq1a8samle5q40q6po87j6up6.apps.googleusercontent.com"

echo ""
echo "[1/8] Updating system packages..."
apt update && apt upgrade -y

echo ""
echo "[2/8] Installing Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"

echo ""
echo "[3/8] Installing Nginx..."
apt install -y nginx git

echo ""
echo "[4/8] Installing PM2..."
npm install -g pm2

echo ""
echo "[5/8] Verifying repository root..."
REPO_DIR="$(pwd)"

if [ ! -d .git ]; then
    echo "This script must be run inside the streetsense repository root."
    echo "Run: git clone $REPO_URL && cd streetsense"
    exit 1
fi

echo ""
echo "[5a/8] Setting up backend..."
cd server
npm install

# Create .env file
cat > .env << EOF
MONGO_URI=${MONGO_URI}
JWT_SECRET=${JWT_SECRET}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://${DOMAIN},http://${DOMAIN}
EOF

# Create uploads directory
mkdir -p uploads
chmod 755 uploads

echo ""
echo "[5b/8] Setting up frontend..."
cd ../client
npm install --legacy-peer-deps

# Create production environment
cat > .env.production << EOF
REACT_APP_BACKEND_URL=https://${DOMAIN}
REACT_APP_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
EOF

# Build React app
echo "Building React app (this may take a few minutes)..."
npm run build

echo ""
echo "[6/8] Configuring SSL..."
mkdir -p /etc/nginx/ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out /etc/nginx/ssl/cert.pem \
  -subj "/C=IN/ST=Telangana/L=Hyderabad/O=StreetSense/CN=${DOMAIN}"

chmod 644 /etc/nginx/ssl/cert.pem
chmod 600 /etc/nginx/ssl/key.pem

echo ""
echo "[7/8] Configuring Nginx..."

# Create Nginx main config if missing
if [ ! -f /etc/nginx/nginx.conf ]; then
cat > /etc/nginx/nginx.conf << 'MAINCONF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    types_hash_max_size 2048;
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
MAINCONF
fi

# Create necessary directories
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled
mkdir -p /etc/nginx/conf.d
mkdir -p /etc/nginx/modules-enabled
mkdir -p /var/log/nginx

# Create site configuration
cat > /etc/nginx/sites-available/streetsense << 'SITECONF'
# HTTP - Redirect to HTTPS
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 301 https://$host$request_uri;
}

# HTTPS - Main application
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name _;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Increase body size for image uploads (50MB)
    client_max_body_size 50M;
    
    # Frontend - Serve React build
    location / {
        root ${REPO_DIR}/client/build;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API - Proxy to Node.js
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for image uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # WebSocket - Socket.IO (for real-time features)
    location /socket.io {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Uploaded images - Serve directly from filesystem
    location /uploads {
        alias ${REPO_DIR}/server/uploads;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=86400";
        add_header Cross-Origin-Resource-Policy "cross-origin";
        autoindex off;
        
        # Image optimization
        location ~* \.(jpg|jpeg|png|gif|webp)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
SITECONF

# Enable the site
ln -sf /etc/nginx/sites-available/streetsense /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

echo ""
echo "[8/8] Starting backend with PM2..."
cd $REPO_DIR/server

# Stop existing if running
pm2 delete streetsense-backend 2>/dev/null || true

# Start with PM2
pm2 start index.js --name streetsense-backend --watch --ignore-watch="uploads node_modules"
pm2 save
pm2 startup systemd -u root --hp /root

# Seed demo data
echo ""
echo "Seeding demo data..."
node seed.js

echo ""
echo "[Optional] Setting up firewall..."
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

echo ""
echo "=========================================="
echo "  DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Your app is live at:"
echo "  https://${DOMAIN}"
echo ""
echo "Useful commands:"
echo "  pm2 logs streetsense-backend    # View backend logs"
echo "  pm2 restart streetsense-backend # Restart backend"
echo "  pm2 status                      # Check status"
echo "  tail -f /var/log/nginx/error.log # Nginx errors"
echo ""
echo "To update after code changes:"
echo "  cd ${REPO_DIR} && git pull"
echo "  cd server && npm install && pm2 restart streetsense-backend"
echo "  cd ../client && npm install --legacy-peer-deps && npm run build"
echo ""
echo "NOTE: You'll see a browser security warning because of"
echo "the self-signed SSL certificate. Click 'Advanced' and"
echo "'Proceed' to continue."
echo ""
echo "=========================================="
