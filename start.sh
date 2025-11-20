#!/bin/bash

# StreetSense Quick Start Script

echo "🚀 Starting StreetSense Development Environment..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from example...${NC}"
    cp .env.example server/.env
    echo -e "${RED}⚠️  IMPORTANT: Edit server/.env with your MongoDB URI and secrets!${NC}"
    echo ""
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Node.js
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) found${NC}"

# Check npm
if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm -v) found${NC}"
echo ""

# Install dependencies if needed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
    echo -e "${GREEN}✓ Server dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Server dependencies already installed${NC}"
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
    echo -e "${GREEN}✓ Client dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Client dependencies already installed${NC}"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo ""
echo "  Terminal 1 (Server):"
echo "    cd server && npm start"
echo ""
echo "  Terminal 2 (Client):"
echo "    cd client && npm start"
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo -e "${YELLOW}Note: Make sure MongoDB is running!${NC}"
