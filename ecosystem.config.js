module.exports = {
  apps: [
    {
      name: "mwuKenya-server",
      script: "./dist/index.js",
      cwd: "/var/www/mwuKenya",
      instances: 1,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      // Logging
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Process management
      watch: false,
      ignore_watch: ["node_modules", "logs", ".git"],
      max_memory_restart: "1G",

      // Auto restart settings
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",

      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
    },
  ],

  deploy: {
    production: {
      user: "ec2-user",
      host: ["your-ec2-host"],
      ref: "origin/main",
      repo: "https://github.com/your-username/your-repo.git",
      path: "/var/www/mwuKenya",
      "post-deploy":
        "npm ci --only=production && npm run build && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "mkdir -p /var/www/mwuKenya/logs",
    },
  },
};
