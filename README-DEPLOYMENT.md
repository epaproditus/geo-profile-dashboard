# Geo Profile Dashboard Deployment Guide

## Completed Tasks

We've successfully prepared the geo-profile-dashboard application for deployment with a root cron job for schedule execution. Here's what we've accomplished:

1. Created a clean executor script (`scripts/executor.js`) for running scheduled tasks
2. Updated the shell script (`run-scheduler.sh`) with better path detection and error handling
3. Provided a PM2 configuration file (`ecosystem.config.cjs`) for managing the application
4. Set up environment templates and documentation
5. Created deployment guides and a checklist for production setup
6. Ensured all scripts are working properly with necessary dependencies

## Deployment Process

To deploy to your VPS, follow these steps:

1. **Clone the repository to your VPS:**
   ```bash
   git clone <your-repo-url> /var/www/geo-profile-dashboard
   cd /var/www/geo-profile-dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.template .env
   nano .env  # Edit with your actual values
   ```

4. **Build the application:**
   ```bash
   npm run build
   ```

5. **Set up process management with PM2:**
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```

6. **Set up the cron job to run scheduler:**
   ```bash
   # Make scripts executable
   chmod +x run-scheduler.sh
   chmod +x scripts/executor.js
   
   # Create log file with proper permissions
   sudo touch /var/log/schedule-executor.log
   sudo chmod 644 /var/log/schedule-executor.log
   
   # Add cron job to root
   sudo crontab -e
   ```
   
   Add this line to the crontab:
   ```
   */5 * * * * /var/www/geo-profile-dashboard/run-scheduler.sh
   ```

7. **Set up Cloudflare Tunnel:**
   - Follow the detailed instructions in the DEPLOYMENT.md file
   - This will create a secure connection to your application without exposing ports

## Testing the Deployment

After deployment, perform these tests:

1. **Test the scheduler:**
   ```bash
   sudo ./run-scheduler.sh
   sudo tail -f /var/log/schedule-executor.log
   ```

2. **Access the web UI:**
   Visit your Cloudflare Tunnel URL (e.g., https://geo-profile.yourdomain.com)

3. **Test schedule creation and execution:**
   - Create a new schedule in the UI
   - Set the execution time to run within the next 5-10 minutes
   - Wait for the scheduler to execute and check the logs
   - Verify the schedule was successfully executed

## Important Files

- `server.js` - Express server that serves the application
- `scripts/executor.js` - The clean script that runs scheduled tasks
- `run-scheduler.sh` - Shell script for cron job execution
- `ecosystem.config.cjs` - PM2 configuration
- `DEPLOYMENT.md` - Detailed deployment instructions
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist for deployment
- `crontab.example` - Example crontab configuration

## Troubleshooting

If you encounter issues:

1. **Check the logs:**
   ```bash
   sudo tail -f /var/log/schedule-executor.log
   pm2 logs
   ```

2. **Verify environment variables:**
   ```bash
   pm2 env 0
   ```

3. **Test the scheduler manually:**
   ```bash
   sudo ./run-scheduler.sh
   ```

4. **Check for permission issues:**
   ```bash
   ls -la /var/www/geo-profile-dashboard
   ls -la /var/log/schedule-executor.log
   ```

For more detailed troubleshooting, refer to the DEPLOYMENT.md document.
