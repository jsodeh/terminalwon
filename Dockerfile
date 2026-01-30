# TerminalWON Server Dockerfile
# Multi-stage build for smaller image
# 
# IMPORTANT: Uses Node.js 20 LTS for node-pty compatibility
# Node.js v24 has breaking changes that prevent node-pty from working

FROM node:20-alpine AS builder

WORKDIR /app

# Copy server files
COPY server/package*.json ./server/
COPY server/ ./server/

# Install dependencies
WORKDIR /app/server
RUN npm ci --only=production

# Production image
FROM node:20-alpine

WORKDIR /app

# Install node-pty dependencies
RUN apk add --no-cache python3 make g++

# Copy from builder
COPY --from=builder /app/server ./server

# Create non-root user
RUN addgroup -g 1001 -S terminalwon && \
    adduser -S terminalwon -u 1001 -G terminalwon

USER terminalwon

WORKDIR /app/server

# Expose ports
EXPOSE 3002 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Start both servers
CMD ["sh", "-c", "node hub-server.js & node mobile-server.js"]
