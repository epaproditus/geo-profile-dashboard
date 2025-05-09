# Deploying Geo Profile Dashboard with Cloudflare Tunnel

This guide explains how to deploy the Geo Profile Dashboard application to a VPS with a Cloudflare Tunnel for secure access.

## Prerequisites

- VPS with root access
- Node.js 16+ installed
- PM2 installed globally (`npm install -g pm2`)
- Cloudflare account
- Domain pointing to Cloudflare nameservers

## Files Overview

- `server.js` - Express server that serves the React app and API endpoints
- `scripts/executor.js` - Schedule executor script
- `run-scheduler.sh` - Shell script for cron job execution
- `ecosystem.config.cjs` - PM2 configuration

## Deployment Steps

### 1. Clone Repository

```bash
git clone <your-repository-url> /var/www/geo-profile-dashboard
cd /var/www/geo-profile-dashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Create a `.env` file based on the template:

```bash
cp .env.template .env
nano .env  # Edit environment variables
```

Add the following to your `.env` file:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SIMPLEMDM_API_KEY=your-simplemdm-api-key
```

### 4. Build Application

```bash
npm run build
```

### 5. Set Up PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 6. Set Up Cron Job

Add a cron job to run the scheduler every 5 minutes:

```bash
sudo crontab -e
```

Add the following line:

```
*/5 * * * * /var/www/geo-profile-dashboard/run-scheduler.sh
```

### 7. Set Up Cloudflare Tunnel

1. Install Cloudflare Tunnel client:

```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

2. Authenticate with Cloudflare:

```bash
cloudflared tunnel login
```

3. Create a new tunnel:

```bash
cloudflared tunnel create geo-profile-dashboard
```

4. Configure the tunnel:

Create a config file at `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: geo-profile.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

5. Route DNS to the tunnel:

```bash
cloudflared tunnel route dns <TUNNEL_ID> geo-profile.yourdomain.com
```

6. Start the tunnel:

```bash
cloudflared service install
```

### 8. Test the Application

Access your application at `https://geo-profile.yourdomain.com`

### 9. Verify Scheduled Tasks

Check the logs to confirm that scheduled tasks are running:

```bash
sudo tail -f /var/log/schedule-executor.log
```

## Troubleshooting

### Cron Job Not Running

1. Check permissions:
   ```bash
   sudo chmod +x /var/www/geo-profile-dashboard/run-scheduler.sh
   sudo chmod +x /var/www/geo-profile-dashboard/scripts/executor.js
   ```

2. Check log file permissions:
   ```bash
   sudo touch /var/log/schedule-executor.log
   sudo chmod 644 /var/log/schedule-executor.log
   ```

### Cloudflare Tunnel Issues

1. Check tunnel status:
   ```bash
   cloudflared tunnel info <TUNNEL_ID>
   ```

2. Check service logs:
   ```bash
   sudo journalctl -u cloudflared
   ```

### Server Not Starting

1. Check PM2 logs:
   ```bash
   pm2 logs
   ```

2. Check Node.js version:
   ```bash
   node --version
   ```

## Security Considerations

1. Ensure your VPS firewall allows only necessary ports
2. Consider using a non-root user for running the application
3. Regularly update your system and dependencies
4. Use strong passwords and API keys
5. Store sensitive information only in the .env file
