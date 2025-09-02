#!/bin/bash

# MWU Kenya Server Deployment Script
# This script handles automatic deployment from GitHub Actions

set -e  # Exit on any error

# Configuration
APP_NAME="mwuKenya-server"
APP_DIR="/var/www/mwuKenya"
LOG_FILE="/var/www/mwuKenya/deployment.log"
BACKUP_DIR="/var/www/mwuKenya/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root"
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Starting deployment process..."

# Navigate to application directory
cd "$APP_DIR" || error "Failed to navigate to application directory"

# Check if git repository exists
if [ ! -d ".git" ]; then
    error "Git repository not found in $APP_DIR"
fi

# Get current commit before pull
CURRENT_COMMIT=$(git rev-parse HEAD)
log "Current commit: $CURRENT_COMMIT"

# Create backup of current version
log "Creating backup of current version..."
tar -czf "$BACKUP_DIR/app_backup_$TIMESTAMP.tar.gz" . --exclude=node_modules --exclude=.git

# Stash any local changes
git stash push -m "Auto-stash before deployment $TIMESTAMP" || warning "No local changes to stash"

# Pull latest changes
log "Pulling latest changes from remote..."
git pull origin main || error "Failed to pull latest changes"

# Get new commit
NEW_COMMIT=$(git rev-parse HEAD)
log "New commit: $NEW_COMMIT"

# Check if there are actual changes
if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
    log "No new changes detected, skipping deployment"
    exit 0
fi

# Install dependencies
log "Installing dependencies..."
npm ci --only=production || error "Failed to install dependencies"

# Build the application
log "Building application..."
npm run build || error "Failed to build application"

# Run database migrations
log "Running database migrations..."
npm run db:migrate || warning "Database migration failed, but continuing deployment"

# Restart the application
log "Restarting application with PM2..."
pm2 restart "$APP_NAME" || error "Failed to restart application"

# Save PM2 configuration
pm2 save || warning "Failed to save PM2 configuration"

# Wait for application to start
log "Waiting for application to start..."
sleep 10

# Check application status
log "Checking application status..."
pm2 status "$APP_NAME" || error "Application is not running"

# Health check
log "Performing health check..."
if curl -f http://localhost:5000/api/v1/health > /dev/null 2>&1; then
    log "Health check passed"
else
    error "Health check failed"
fi

# Cleanup old backups (keep last 5)
log "Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t | tail -n +6 | xargs -r rm -f

log "Deployment completed successfully!"
log "Application restarted and running"

# Log deployment completion
echo "Deployment completed successfully at $(date) - From: $CURRENT_COMMIT To: $NEW_COMMIT" >> "$LOG_FILE"

exit 0
