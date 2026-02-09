module.exports = {
  apps: [
    {
      name: 'scholarflex-backend',
      script: './server.js',
      instances: 'max', // Use all CPU cores, or set a number like 4
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      // Auto-restart settings
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      // Advanced settings
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Graceful shutdown
      shutdown_with_message: true,
    },
  ],
};
