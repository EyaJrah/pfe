# Stage 1: Build the React app
FROM node:18-alpine AS builder
 
# Set working directory
WORKDIR /app
 
# Install dependencies
COPY package.json ./
RUN npm install
 
# Copy source files
COPY . .
 
# Build the app
RUN npm run build
 
# Stage 2: Serve with Nginx
FROM nginx:alpine
 
# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*
 
# Copy built React app from builder
COPY --from=builder /app/dist/temp-app/browser /usr/share/nginx/html
 
# Copy custom nginx config (optional)
# COPY nginx.conf /etc/nginx/nginx.conf
 
# Expose port
EXPOSE 80
 
# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
 
