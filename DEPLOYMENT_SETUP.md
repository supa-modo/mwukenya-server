# MWU Kenya EC2 Deployment Setup Guide

## 🚀 Quick Fix Summary

Your GitHub Actions deployment was failing because of incorrect directory structure assumptions. Here are the fixes applied:

### Issues Fixed:

1. **Wrong directory paths** - Scripts expected `/var/www/mwuKenya/server` but files are in `/var/www/mwuKenya`
2. **Incorrect cache paths** in GitHub Actions workflow
3. **Wrong health check URLs** - Updated from port 3001 to 5000
4. **Mismatched working directories** in CI/CD pipeline

## 📁 Current Directory Structure

```
/var/www/mwuKenya/
├── src/
├── dist/
├── package.json
├── package-lock.json
├── ecosystem.config.js
├── scripts/
├── logs/
└── backups/
```

## 🔧 Files Updated

### 1. `.github/workflows/deploy.yml`

- Fixed cache dependency paths: `server/package-lock.json`
- Updated working directories to `server`
- Corrected deployment script paths

### 2. `scripts/deploy.sh`

- Updated `APP_DIR="/var/www/mwuKenya"`
- Fixed health check URL to port 5000
- Corrected all directory references

### 3. `scripts/setup-github-actions.sh`

- Updated health check endpoints
- Fixed test deployment script paths
- Corrected PM2 process references

### 4. `ecosystem.config.js` (New)

- Created PM2 configuration for your directory structure
- Set correct working directory: `/var/www/mwuKenya`
- Configured proper logging and process management

## 🛠️ Setup Instructions

### Step 1: Update Your EC2 Instance

1. **Navigate to your app directory:**

   ```bash
   cd /var/www/mwuKenya
   ```

2. **Copy the updated files to your EC2:**

   - Upload the fixed `ecosystem.config.js`
   - Make sure `scripts/deploy.sh` is executable:
     ```bash
     chmod +x scripts/deploy.sh
     ```

3. **Update PM2 configuration:**
   ```bash
   pm2 delete mwuKenya-server  # Stop old process
   pm2 start ecosystem.config.js --env production
   pm2 save
   ```

### Step 2: Configure GitHub Secrets

Make sure these secrets are set in your GitHub repository:

```
EC2_HOST=your-ec2-public-ip
EC2_USERNAME=ec2-user
EC2_SSH_KEY=your-private-ssh-key
EC2_PORT=22
EC2_HEALTH_CHECK_URL=http://your-ec2-public-ip:5000/api/v1/health
```

### Step 3: Test the Setup

1. **Test health endpoint:**

   ```bash
   curl http://localhost:5000/api/v1/health
   ```

2. **Check PM2 status:**

   ```bash
   pm2 status
   pm2 logs mwuKenya-server
   ```

3. **Test deployment script:**
   ```bash
   ./scripts/deploy.sh
   ```

### Step 4: Test GitHub Actions

1. **Push a small change to trigger deployment**
2. **Check GitHub Actions tab for workflow status**
3. **Verify deployment logs in your EC2 instance**

## 🔍 Troubleshooting

### Common Issues:

1. **Permission Denied:**

   ```bash
   chmod +x scripts/deploy.sh
   chown -R ec2-user:ec2-user /var/www/mwuKenya
   ```

2. **PM2 Not Found:**

   ```bash
   npm install -g pm2
   ```

3. **Port Already in Use:**

   ```bash
   pm2 delete all
   pm2 start ecosystem.config.js --env production
   ```

4. **Health Check Failing:**
   - Verify your app is running on port 5000
   - Check if firewall allows port 5000
   - Ensure health endpoint exists: `/api/v1/health`

### Logs to Check:

```bash
# Application logs
pm2 logs mwuKenya-server

# Deployment logs
tail -f /var/www/mwuKenya/deployment.log

# System logs
journalctl -u nginx  # if using nginx
```

## ✅ Verification Checklist

- [ ] Files are in `/var/www/mwuKenya` (not `/var/www/mwuKenya/server`)
- [ ] PM2 ecosystem config is properly configured
- [ ] Health endpoint responds at `:5000/api/v1/health`
- [ ] GitHub secrets are correctly set
- [ ] Deployment script has execute permissions
- [ ] Git repository is properly configured

## 🚀 Next Steps

1. **Test the deployment** by pushing a commit
2. **Monitor the GitHub Actions workflow**
3. **Check application logs** after deployment
4. **Verify health endpoint** is responding

Your deployment should now work correctly! 🎉
