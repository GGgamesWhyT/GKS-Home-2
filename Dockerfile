# Stage 1: Build dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY server/package*.json ./server/

# Install dependencies
WORKDIR /app/server
RUN npm install --production

# Stage 2: Production image
FROM node:20-alpine

# Add labels
LABEL maintainer="GKS Home Dashboard"
LABEL version="1.0"
LABEL description="Home dashboard with Proxmox, Jellyfin, and Jellyseerr integration"

WORKDIR /app

# Copy frontend files
COPY index.html servers.html styles.css app.js config.js servers.js mascot.js favicon.jpg ./
COPY widgets/ ./widgets/
COPY guides/ ./guides/
COPY Logo\'s/ ./Logo\'s/

# Copy server files and dependencies
COPY server/package*.json ./server/
COPY server/proxy.js ./server/
COPY --from=builder /app/server/node_modules ./server/node_modules

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the server
WORKDIR /app/server
CMD ["node", "proxy.js"]
