# client/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app

# Accept build-time environment overrides
ARG REACT_APP_BACKEND_URL=""
ARG REACT_APP_GOOGLE_CLIENT_ID=""
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
ENV SKIP_PREFLIGHT_CHECK=true
ENV DISABLE_ESLINT_PLUGIN=true

# Copy package files and .npmrc
COPY package*.json .npmrc ./

# Clean install from lock file (strict, reproducible)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage with nginx
FROM nginx:stable-alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
