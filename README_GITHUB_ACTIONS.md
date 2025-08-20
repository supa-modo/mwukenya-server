# GitHub Actions Setup for MWU Kenya Server

This directory contains all the necessary files and configurations for setting up automated deployment from GitHub to your EC2 instance.

## 🚀 Quick Start

1. **Run the setup script on your EC2 instance:**

   ```bash
   cd /var/www/mwu-kenya/mwuKenya/server
   ./scripts/setup-github-actions.sh
   ```

2. **Generate SSH key pair for GitHub Actions:**

   ```bash
   ssh-keygen -t rsa -b 4096 -C "github-actions@mwukenya.co.ke" -f ~/.ssh/github-actions
   ```

3. **Add public key to EC2:**

   ```bash
   cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
   ```

4. **Configure GitHub repository secrets** (see detailed guide below)

5. **Test deployment** by pushing to main branch

## 📁 Files Overview

### GitHub Actions Workflows

- **`.github/workflows/deploy.yml`** - Main production deployment workflow
- **`.github/workflows/deploy-staging.yml`** - Staging environment deployment
- **`.github/workflows/rollback.yml`** - Rollback to previous versions

### Server Scripts

- **`scripts/deploy.sh`** - Main deployment script for EC2
- **`scripts/setup-github-actions.sh`** - EC2 setup automation script
- **`ecosystem.config.js`** - PM2 process management configuration

### Documentation

- **`GITHUB_ACTIONS_SETUP.md`** - Comprehensive setup guide
- **`README_GITHUB_ACTIONS.md`** - This file

## 🔧 How It Works

### 1. Code Push Trigger

- When you push code to the `main` branch, GitHub Actions automatically triggers
- Runs tests, builds the application, and deploys to EC2

### 2. Deployment Process

- Connects to EC2 via SSH using the configured key
- Pulls latest changes from GitHub
- Installs dependencies and builds the application
- Runs database migrations
- Restarts the application with PM2
- Performs health checks

### 3. Rollback Capability

- Manual rollback workflow available
- Can rollback to specific commit or previous version
- Automatic backups created before each deployment

## 🛠️ Configuration

### Required GitHub Secrets

```
EC2_HOST: Your EC2 public IP or domain
EC2_USERNAME: ec2-user (or ubuntu)
EC2_SSH_KEY: Private SSH key content
EC2_PORT: 22
EC2_HEALTH_CHECK_URL: https://yourdomain.com/health
```

### Optional Staging Secrets

```
STAGING_EC2_HOST: Staging EC2 IP/domain
STAGING_EC2_USERNAME: ec2-user
STAGING_EC2_SSH_KEY: Private SSH key content
STAGING_EC2_PORT: 22
STAGING_EC2_HEALTH_CHECK_URL: https://staging.yourdomain.com/health
```

## 📋 Prerequisites

- ✅ EC2 instance running with your application
- ✅ PM2 process manager installed
- ✅ SSH access to EC2 instance
- ✅ Application already deployed and running
- ✅ Health check endpoint working (`/health`)

## 🔍 Monitoring

### GitHub Actions

- Monitor workflow runs in the Actions tab
- Check logs for any deployment issues
- Use manual triggers for testing

### EC2 Instance

- Check PM2 status: `pm2 status`
- View logs: `pm2 logs mwu-kenya-server`
- Monitor deployment log: `tail -f /var/www/mwu-kenya/deployment.log`
- Test health: `curl http://localhost:3001/health`

## 🚨 Troubleshooting

### Common Issues

1. **SSH Connection Failed** - Check key permissions and authorized_keys
2. **Permission Denied** - Ensure proper file ownership on EC2
3. **Build Failed** - Check Node.js version and dependencies
4. **PM2 Issues** - Restart PM2 daemon and check configuration

### Debug Commands

```bash
# Test SSH connection
ssh -i ~/.ssh/github-actions ec2-user@localhost

# Check application status
pm2 status
pm2 logs mwu-kenya-server

# Test deployment manually
./scripts/deploy.sh

# Check git configuration
git remote -v
git status
```

## 🔄 Workflow Types

### Production Deployment (`main` branch)

- Automatic deployment to production EC2
- Full testing and validation
- Health checks and monitoring

### Staging Deployment (`develop` branch)

- Deploy to staging environment
- Testing before production
- Safe validation environment

### Manual Triggers

- Manual deployment trigger available
- Rollback workflows for emergency situations
- Testing workflows for development

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [EC2 Deployment Guide](../EC2_Deployment_Guide.md)
- [Detailed Setup Guide](GITHUB_ACTIONS_SETUP.md)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review GitHub Actions logs
3. Verify EC2 instance status
4. Check application logs on EC2
5. Ensure all prerequisites are met

---

**Note**: This setup provides a robust, automated deployment pipeline. Always test changes in staging before deploying to production.
