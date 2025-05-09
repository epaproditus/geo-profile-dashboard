module.exports = {
  apps: [
    {
      name: "geo-profile-app",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      env_production: {
        NODE_ENV: "production"
      },
      watch: false,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10
    }
  ]
};
