# Monitoring and Maintenance Guide

This document provides guidance on monitoring and maintaining the Geo Profile Dashboard application in production.

## Monitoring

### Log Files

The primary log files to monitor:

1. **Scheduler Logs**: 
   ```bash
   sudo tail -f /var/log/schedule-executor.log
   ```
   
2. **PM2 Application Logs**:
   ```bash
   pm2 logs geo-profile-app
   ```
   
3. **System Logs**:
   ```bash
   sudo tail -f /var/log/syslog
   ```

### Cron Job Status

Check if cron jobs are properly scheduled:

```bash
sudo crontab -l
```

Check if cron jobs are being executed:

```bash
sudo grep CRON /var/log/syslog
```

### Application Status

Check the running status of the application:

```bash
pm2 status
```

Check if the application is accessible:

```bash
curl -I http://localhost:3000
```

Check the Cloudflare Tunnel status:

```bash
cloudflared tunnel info <TUNNEL_ID>
```

### Database Status

Check if the application can connect to Supabase:

```bash
cd /var/www/geo-profile-dashboard
node -e "require('dotenv').config(); const { createClient } = require('@supabase/supabase-js'); const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); supabase.from('schedules').select('count').then(console.log).catch(console.error)"
```

## Maintenance

### Regular Updates

#### Update the Application

```bash
cd /var/www/geo-profile-dashboard
git pull
npm install
npm run build
pm2 restart geo-profile-app
```

#### Update Node.js

```bash
sudo apt update
sudo apt install nodejs npm
```

#### Update Cloudflared

```bash
sudo cloudflared update
sudo systemctl restart cloudflared
```

### Backup Strategies

#### Environment Configuration

```bash
cp /var/www/geo-profile-dashboard/.env /var/www/geo-profile-dashboard/.env.backup
```

#### Crontab Configuration

```bash
sudo crontab -l > /var/www/geo-profile-dashboard/crontab-backup.txt
```

#### PM2 Configuration

```bash
pm2 save
```

### Log Rotation

Set up log rotation to prevent log files from consuming too much disk space:

```bash
sudo nano /etc/logrotate.d/geo-profile-dashboard
```

Add the following configuration:

```
/var/log/schedule-executor.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
```

### Restarting Services

#### Restart the Application

```bash
pm2 restart geo-profile-app
```

#### Restart Cloudflare Tunnel

```bash
sudo systemctl restart cloudflared
```

#### Restart Cron Service

```bash
sudo systemctl restart cron
```

## Troubleshooting

### Application Not Starting

Check for errors in PM2 logs:

```bash
pm2 logs geo-profile-app --err --lines 100
```

Check for missing dependencies:

```bash
cd /var/www/geo-profile-dashboard
npm ls --depth=0
```

### Scheduler Not Running

Check if the log file exists and has proper permissions:

```bash
ls -la /var/log/schedule-executor.log
```

Try running the scheduler manually:

```bash
sudo /var/www/geo-profile-dashboard/run-scheduler.sh
```

### Cloudflare Tunnel Connection Issues

Check the tunnel status:

```bash
cloudflared tunnel info <TUNNEL_ID>
```

Check the tunnel logs:

```bash
sudo journalctl -u cloudflared
```

### Memory or CPU Issues

Check resource usage:

```bash
pm2 monit
```

Check system resource usage:

```bash
top
```

## Performance Optimization

### Node.js Settings

Adjust the Node.js memory limit if needed:

```bash
# In ecosystem.config.cjs
node_args: "--max-old-space-size=512",
```

### PM2 Configuration

Adjust the instance count for better performance (if your VPS has multiple cores):

```bash
# In ecosystem.config.cjs
instances: "max",
exec_mode: "cluster",
```

### Monitoring with Cronitor (Optional)

If you've configured Cronitor, check the dashboard for monitoring data:

```
https://cronitor.io/dashboard
```

## Security Practices

### Keep Dependencies Updated

```bash
npm audit
npm audit fix
```

### Secure Environment Variables

Ensure your .env file has restricted permissions:

```bash
chmod 600 /var/www/geo-profile-dashboard/.env
```

### Use HTTPS Only

Ensure that your Cloudflare Tunnel is configured to enforce HTTPS.

### Enable HTTP Strict Transport Security (HSTS)

Configure HSTS in your Cloudflare dashboard for your domain.
