# server/Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies from the lock file
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Drop root: the app only ever reads its own files.
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "index.js"]
