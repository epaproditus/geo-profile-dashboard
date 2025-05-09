# Deployment Checklist

## VPS Preparation
- [ ] OS updated with `apt update && apt upgrade` (if using Ubuntu/Debian)
- [ ] Node.js installed (recommended v16+)
- [ ] PM2 installed globally `npm install -g pm2`
- [ ] Git installed `apt install git`
- [ ] Created deployment folder `/var/www/geo-profile-dashboard`
- [ ] Proper folder permissions set for the application

## Application Setup
- [ ] Code cloned to deployment folder
- [ ] Dependencies installed with `npm install`
- [ ] Created `.env` file from template
- [ ] Added correct Supabase credentials
- [ ] Added correct SimpleMDM API key
- [ ] Built application with `npm run build`
- [ ] Tested server with `npm run server`
- [ ] PM2 configured with `pm2 start ecosystem.config.cjs`
- [ ] PM2 startup configured with `pm2 startup` and `pm2 save`

## Scheduler Setup
- [ ] Made `run-scheduler.sh` executable with `chmod +x run-scheduler.sh`
- [ ] Made `scripts/executor.js` executable with `chmod +x scripts/executor.js`
- [ ] Made `rotate-logs.sh` executable with `chmod +x rotate-logs.sh`
- [ ] Made `backup-db.sh` executable with `chmod +x backup-db.sh`
- [ ] Created log file `touch /var/log/scheduler.log`
- [ ] Set proper permissions on log file `chmod 644 /var/log/scheduler.log`
- [ ] Added cron job to crontab `crontab -e`
- [ ] Added log rotation to crontab
- [ ] Tested scheduler execution manually `./run-scheduler.sh`
- [ ] Verified logs to confirm execution `tail -f /var/log/scheduler.log`

## Database Setup
- [ ] Applied all database migrations `npx supabase db push`
- [ ] Added missing execution columns (see DB_MIGRATION.md)
- [ ] Verified schedules table structure
- [ ] Created backups directory `mkdir -p /var/www/geo-profile-dashboard/backups`
- [ ] Cloudflare account active with domain
- [ ] Domain using Cloudflare nameservers
- [ ] Cloudflared installed on VPS
- [ ] Authenticated with Cloudflare `cloudflared tunnel login`
- [ ] Created tunnel `cloudflared tunnel create geo-profile-dashboard`
- [ ] Configured tunnel with config file
- [ ] DNS route created for tunnel
- [ ] Tunnel service installed and running
- [ ] Verified connectivity to application through tunnel

## Post-Deployment Tests
- [ ] Web UI accessible through tunnel URL
- [ ] Login working correctly
- [ ] Able to create and edit profiles
- [ ] Able to create and edit schedules
- [ ] Confirmed scheduler is running via cron by checking logs
- [ ] Verified recurring schedules are updating correctly

## Monitoring Setup (Optional)
- [ ] Cronitor monitoring configured (if using)
- [ ] Email or other alerting set up for failures
- [ ] Log rotation configured for application logs
