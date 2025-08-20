module.exports = {
  apps: [
    {
      name: "mwuKenya-server",
      script: "dist/index.js",
      cwd: "/var/www/mwuKenya",
      instances: 1,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      // Logging
      log_file: "/var/www/mwuKenya/logs/combined.log",
      out_file: "/var/www/mwuKenya/logs/out.log",
      error_file: "/var/www/mwuKenya/logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Process management
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,

      // Monitoring
      watch: false,
      ignore_watch: ["node_modules", "logs", "dist"],

      // Memory and CPU limits
      max_memory_restart: "1G",

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Health check
      health_check_grace_period: 3000,

      // Environment variables
      env_file: ".env",

      // Merge logs
      merge_logs: true,

      // Source map support
      source_map_support: true,

      // Node options
      node_args: "--max-old-space-size=1024",
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: "ubuntu",
      host: "localhost",
      ref: "origin/main",
      repo: "https://github.com/supa-modo/mwukenya-server.git",
      path: "/var/www/mwuKenya",
      "post-deploy":
        "npm ci --only=production && npm run build && pm2 restart ecosystem.config.js --env production",
    },
  },
};
