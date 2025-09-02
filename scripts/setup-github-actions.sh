#!/bin/bash

# MWU Kenya GitHub Actions Setup Script
# Run this script on your EC2 instance to prepare it for GitHub Actions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/mwuKenya"
SERVER_DIR="$APP_DIR"
BACKUP_DIR="$APP_DIR/backups"
LOGS_DIR="$APP_DIR/logs"

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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root. Please run as ec2-user"
fi

log "Starting GitHub Actions setup for MWU Kenya Server..."

# Create necessary directories
log "Creating necessary directories..."
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOGS_DIR"
mkdir -p "$APP_DIR/.ssh"

# Set proper permissions
log "Setting proper permissions..."
chmod 700 "$APP_DIR/.ssh"
chmod 755 "$APP_DIR"
chmod 755 "$SERVER_DIR"

# Check if git repository exists
if [ ! -d "$SERVER_DIR/.git" ]; then
    error "Git repository not found in $SERVER_DIR"
fi

# Configure git for automated deployments
log "Configuring git for automated deployments..."
cd "$SERVER_DIR"

# Check current remote
CURRENT_REMOTE=$(git remote get-url origin)
info "Current git remote: $CURRENT_REMOTE"

# Ask user if they want to change the remote
read -p "Do you want to change the git remote? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter new git remote URL: " NEW_REMOTE
    git remote set-url origin "$NEW_REMOTE"
    log "Git remote updated to: $NEW_REMOTE"
fi

# Test git pull
log "Testing git pull..."
if git pull origin main; then
    log "Git pull successful"
else
    warning "Git pull failed. Please check your git configuration"
fi

# Setup PM2 ecosystem
log "Setting up PM2 ecosystem..."
if [ -f "ecosystem.config.js" ]; then
    log "PM2 ecosystem config found"
    
    # Update the repo URL in ecosystem config
    sed -i "s|your-username|$(git remote get-url origin | sed -n 's/.*github\.com[:/]\([^/]*\).*/\1/p')|g" ecosystem.config.js
    
    # Start/restart with PM2
    if pm2 list | grep -q "mwu-kenya-server"; then
        log "Restarting existing PM2 process..."
        pm2 restart ecosystem.config.js --env production
    else
        log "Starting new PM2 process..."
        pm2 start ecosystem.config.js --env production
    fi
    
    pm2 save
    log "PM2 configuration saved"
else
    warning "PM2 ecosystem config not found. Please create it manually"
fi

# Setup log rotation
log "Setting up log rotation..."
if ! pm2 list | grep -q "pm2-logrotate"; then
    log "Installing PM2 logrotate..."
    pm2 install pm2-logrotate
    pm2 set pm2-logrotate:max_size 10M
    pm2 set pm2-logrotate:retain 7
    pm2 set pm2-logrotate:compress true
    pm2 save
    log "PM2 logrotate configured"
else
    log "PM2 logrotate already installed"
fi

# Create deployment script
log "Setting up deployment script..."
if [ -f "scripts/deploy.sh" ]; then
    chmod +x "scripts/deploy.sh"
    log "Deployment script made executable"
else
    warning "Deployment script not found. Please create it manually"
fi

# Setup health check
log "Setting up health check..."
if curl -f http://localhost:5000/api/v1/health > /dev/null 2>&1; then
    log "Health check endpoint is working"
else
    warning "Health check endpoint is not responding. Please check your application"
fi

# Create a simple deployment test
log "Creating deployment test script..."
cat > "$APP_DIR/test-deployment.sh" << 'EOF'
#!/bin/bash
echo "Testing deployment process..."
cd /var/www/mwuKenya
git status
echo "Current commit: $(git rev-parse HEAD)"
echo "PM2 status:"
pm2 status
echo "Health check:"
curl -s http://localhost:5000/api/v1/health | jq . || echo "Health check failed"
EOF

chmod +x "$APP_DIR/test-deployment.sh"
log "Deployment test script created at $APP_DIR/test-deployment.sh"

# Final checks
log "Performing final checks..."

# Check PM2 status
if pm2 list | grep -q "mwu-kenya-server"; then
    log "✅ PM2 process is running"
else
    error "❌ PM2 process is not running"
fi

# Check application health
if curl -f http://localhost:5000/api/v1/health > /dev/null 2>&1; then
    log "✅ Application is responding to health checks"
else
    warning "⚠️ Application is not responding to health checks"
fi

# Check git configuration
if git remote get-url origin | grep -q "github.com"; then
    log "✅ Git remote is configured correctly"
else
    warning "⚠️ Git remote may not be configured correctly"
fi

# Summary
log "=== Setup Complete ==="
log "Your EC2 instance is now ready for GitHub Actions deployments!"
log ""
log "Next steps:"
log "1. Generate SSH key pair for GitHub Actions"
log "2. Add public key to ~/.ssh/authorized_keys"
log "3. Configure GitHub repository secrets"
log "4. Test the deployment workflow"
log ""
log "Useful commands:"
log "- Test deployment: $APP_DIR/test-deployment.sh"
log "- Check PM2 status: pm2 status"
log "- View logs: pm2 logs mwu-kenya-server"
log "- Check health: curl http://localhost:5000/api/v1/health"
log ""
log "For detailed setup instructions, see: GITHUB_ACTIONS_SETUP.md"

exit 0
