# GitHub Actions Setup Guide for MWU Kenya Server

This guide will walk you through setting up GitHub Actions for automatic deployment to your EC2 instance.

## Prerequisites

- ✅ GitHub repository with your code
- ✅ EC2 instance running with your application
- ✅ SSH access to your EC2 instance
- ✅ PM2 process manager installed
- ✅ Application already deployed and running

## Step 1: Generate SSH Key Pair for GitHub Actions

### On Your Local Machine:

```bash
# Generate a new SSH key pair specifically for GitHub Actions
ssh-keygen -t rsa -b 4096 -C "github-actions@mwukenya.co.ke" -f ~/.ssh/github-actions

# This will create:
# ~/.ssh/github-actions (private key)
# ~/.ssh/github-actions.pub (public key)
```

### Add Public Key to EC2 Instance:

```bash
# Copy the public key content
cat ~/.ssh/github-actions.pub

# SSH to your EC2 instance
ssh -i "your-ec2-key.pem" ec2-user@your-ec2-ip

# Add the public key to authorized_keys
echo "YOUR_PUBLIC_KEY_CONTENT_HERE" >> ~/.ssh/authorized_keys

# Set proper permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

## Step 2: Configure GitHub Repository Secrets

### Go to Your GitHub Repository:

1. Navigate to your repository on GitHub
2. Click on **Settings** tab
3. Click on **Secrets and variables** → **Actions**
4. Click **New repository secret**

### Add These Secrets:

#### Production Environment:

```
EC2_HOST: Your EC2 public IP or domain
EC2_USERNAME: ec2-user (or ubuntu for Ubuntu AMI)
EC2_SSH_KEY: Your private SSH key content (from ~/.ssh/github-actions)
EC2_PORT: 22
EC2_HEALTH_CHECK_URL: https://yourdomain.com/health
```

#### Staging Environment (Optional):

```
STAGING_EC2_HOST: Your staging EC2 IP/domain
STAGING_EC2_USERNAME: ec2-user
STAGING_EC2_SSH_KEY: Your private SSH key content
STAGING_EC2_PORT: 22
STAGING_EC2_HEALTH_CHECK_URL: https://staging.yourdomain.com/health
```

## Step 3: Test the SSH Connection

### On Your EC2 Instance:

```bash
# Test if the GitHub Actions user can SSH
sudo -u ec2-user ssh -i ~/.ssh/github-actions localhost

# If successful, you should see a shell prompt
```

## Step 4: Configure Git on EC2 for Automated Pulls

### On Your EC2 Instance:

```bash
# Navigate to your application directory
cd /var/www/mwuKenya

# Configure git to use HTTPS (more secure for automation)
git remote set-url origin https://github.com/supa-modo/mwukenya-server.git

# Or if you prefer SSH, ensure the key is properly configured
git remote set-url origin git@github.com:your-username/crewAfya-payments.git

# Test git pull
git pull origin main
```

## Step 5: Test the GitHub Actions Workflow

### 1. Make a Small Change:

```bash
# Make a small change to any file
echo "# Test deployment" >> README.md
git add .
git commit -m "test: Test GitHub Actions deployment"
git push origin main
```

### 2. Monitor the Workflow:

- Go to your GitHub repository
- Click on **Actions** tab
- You should see your workflow running
- Monitor the logs for any errors

## Step 6: Verify Deployment

### On Your EC2 Instance:

```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs mwu-kenya-server

# Check deployment log
tail -f /var/www/mwuKenya/deployment.log

# Test the application
curl http://localhost:3001/health
```

## Step 7: Setup Branch Protection (Recommended)

### On GitHub:

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Set **Branch name pattern** to `main`
4. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators

## Step 8: Environment-Specific Deployments

### Production Branch (main/master):

- Automatically deploys to production EC2
- Runs tests and builds before deployment
- Includes health checks

### Development Branch (develop):

- Deploys to staging environment (if configured)
- Allows testing before production

### Feature Branches:

- Only run tests, no deployment
- Ensure code quality before merging

## Step 9: Monitoring and Troubleshooting

### Check Workflow Status:

```bash
# On GitHub: Actions tab → View workflow runs
# Check for failed steps and error logs
```

### Common Issues and Solutions:

#### 1. SSH Connection Failed:

```bash
# Check SSH key permissions on EC2
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Test SSH connection manually
ssh -i ~/.ssh/github-actions ec2-user@localhost
```

#### 2. Permission Denied:

```bash
# Ensure proper file ownership
sudo chown -R ec2-user:ec2-user /var/www/mwuKenya
sudo chmod -R 755 /var/www/mwuKenya
```

#### 3. Build Failed:

```bash
# Check Node.js version
node --version

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 4. PM2 Issues:

```bash
# Check PM2 status
pm2 status

# Restart PM2 daemon
pm2 kill
pm2 start ecosystem.config.js

# Check PM2 logs
pm2 logs
```

## Step 10: Advanced Configuration

### Custom Deployment Scripts:

The workflow uses the `deploy.sh` script located at `scripts/deploy.sh`. You can customize this script for your specific needs.

### Environment Variables:

Ensure your `.env` file on EC2 has all necessary production environment variables.

### Database Migrations:

The workflow automatically runs `npm run db:migrate` after deployment. Ensure your migration scripts are safe for production.

## Step 11: Security Best Practices

### 1. SSH Key Security:

- Use a dedicated SSH key for GitHub Actions
- Never commit private keys to your repository
- Rotate keys regularly

### 2. Environment Variables:

- Use GitHub Secrets for sensitive data
- Never log sensitive information
- Use different keys for staging/production

### 3. Access Control:

- Limit SSH access to necessary users only
- Use security groups to restrict EC2 access
- Monitor access logs regularly

## Step 12: Backup and Rollback

### Automatic Backups:

The deployment script creates backups before each deployment in `/var/www/mwu-kenya/backups/`

### Manual Rollback:

```bash
# Use the rollback workflow in GitHub Actions
# Or manually on EC2:
cd /var/www/mwuKenya
git checkout <previous-commit-hash>
npm ci --only=production
npm run build
pm2 restart mwuKenya-server
```

## Troubleshooting Checklist

- ✅ [ ] SSH key properly added to EC2
- ✅ [ ] GitHub secrets configured correctly
- ✅ [ ] Git remote configured on EC2
- ✅ [ ] PM2 process running
- ✅ [ ] Application accessible on EC2
- ✅ [ ] Health check endpoint working
- ✅ [ ] Database connection working
- ✅ [ ] All environment variables set

## Support

If you encounter issues:

1. Check GitHub Actions logs for error details
2. Verify EC2 instance status and connectivity
3. Check application logs on EC2
4. Ensure all prerequisites are met
5. Review the troubleshooting section above

## Next Steps

After successful setup:

1. **Monitor deployments** through GitHub Actions
2. **Set up notifications** for deployment status
3. **Configure staging environment** for testing
4. **Implement monitoring** and alerting
5. **Set up backup strategies** for your data

---

**Note**: This setup assumes you're using the main branch for production. Adjust branch names and paths according to your specific setup.
