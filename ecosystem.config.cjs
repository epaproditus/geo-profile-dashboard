module.exports = {
  apps: [
    {
      name: "geo-profile-app",
      script: "npm",
      args: "run preview",
      env: {
        NODE_ENV: "production",
        PORT: "8080"
      },
      watch: false,
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true
    }
  ]
};
