#!/bin/bash

# Fix PM2 Configuration Script for MWU Kenya Server
# This script cleans up duplicate PM2 processes and restarts with correct configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

log "Starting PM2 cleanup and restart..."

# Check if we're in the right directory
if [ ! -f "ecosystem.config.js" ]; then
    error "ecosystem.config.js not found. Please run this script from the server directory."
fi

# Stop all PM2 processes
log "Stopping all PM2 processes..."
pm2 stop all || warning "No processes to stop"

# Delete all PM2 processes
log "Deleting all PM2 processes..."
pm2 delete all || warning "No processes to delete"

# Clear PM2 saved configuration
log "Clearing PM2 saved configuration..."
pm2 cleardump || warning "No saved configuration to clear"

# Check PM2 status (should be empty)
log "Checking PM2 status..."
pm2 status

# Start the application with the ecosystem config
log "Starting application with ecosystem config..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
log "Saving PM2 configuration..."
pm2 save

# Check final status
log "Final PM2 status:"
pm2 status

# Test the application
log "Testing application health..."
sleep 5
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    log "✅ Application is healthy and running!"
else
    warning "⚠️ Application health check failed. Check logs with: pm2 logs mwuKenya-server"
fi

log "PM2 cleanup and restart completed!"
log "Useful commands:"
log "- Check status: pm2 status"
log "- View logs: pm2 logs mwuKenya-server"
log "- Monitor: pm2 monit"
log "- Restart: pm2 restart mwuKenya-server"
