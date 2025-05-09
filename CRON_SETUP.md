# Cron Job Setup for Geo Profile Dashboard

This document provides detailed instructions for setting up the required cron job to execute scheduled profiles via SimpleMDM API.

## Requirements

- Root access to the server
- The geo-profile-dashboard application properly installed and configured
- SimpleMDM API key configured in the `.env` file
- Supabase credentials configured in the `.env` file

## Cron Job Configuration

The geo-profile-dashboard needs to run a scheduler every 5 minutes to check for any profiles that need to be pushed to devices based on configured schedules.

### Step 1: Prepare the Environment

Make sure the execution scripts are executable:

```bash
chmod +x /var/www/geo-profile-dashboard/run-scheduler.sh
chmod +x /var/www/geo-profile-dashboard/scripts/executor.js
```

Create a log file with proper permissions:

```bash
sudo touch /var/log/schedule-executor.log
sudo chmod 644 /var/log/schedule-executor.log
```

### Step 2: Configure the Cron Job as Root

Edit the root crontab:

```bash
sudo crontab -e
```

Add the following line to run the scheduler every 5 minutes:

```
*/5 * * * * /var/www/geo-profile-dashboard/run-scheduler.sh
```

### Step 3: Add Optional Cron Jobs (Recommended)

For better system maintenance, add these optional cron jobs:

```
# Restart the application server daily at 3 AM
0 3 * * * pm2 restart geo-profile-dashboard

# Rotate scheduler logs weekly to prevent them from growing too large
0 0 * * 0 /var/www/geo-profile-dashboard/rotate-logs.sh

# Backup the database weekly
0 2 * * 0 /var/www/geo-profile-dashboard/backup-db.sh > /dev/null 2>&1
0 3 * * * /usr/bin/pm2 restart geo-profile-app

# Rotate logs weekly to prevent large log files
0 0 * * 0 /usr/bin/find /var/log/schedule-executor.log -size +100M -exec truncate -s 0 {} \;
```

### Step 4: Test the Cron Job

You can manually test the scheduler execution:

```bash
sudo /var/www/geo-profile-dashboard/run-scheduler.sh
```

Check the logs to confirm it ran successfully:

```bash
sudo tail -f /var/log/schedule-executor.log
```

### Step 5: Verify Recurring Execution

After setting up the cron job, wait at least 5 minutes and check the logs again to verify that the scheduler is being triggered:

```bash
sudo grep "Starting schedule execution" /var/log/schedule-executor.log
```

You should see periodic entries every 5 minutes.

## Troubleshooting

### Cron Job Not Running

1. Check if cron is running:
   ```bash
   sudo systemctl status cron
   ```

2. Check for syntax errors in crontab:
   ```bash
   sudo crontab -l
   ```

3. Check permissions:
   ```bash
   ls -la /var/www/geo-profile-dashboard/run-scheduler.sh
   ls -la /var/www/geo-profile-dashboard/scripts/executor.js
   ```

4. Check the system cron log:
   ```bash
   sudo grep CRON /var/log/syslog
   ```

### Scheduler Executing But Not Working

1. Check environment variables:
   ```bash
   grep -r "SUPABASE_URL" /var/www/geo-profile-dashboard/.env
   grep -r "SIMPLEMDM_API_KEY" /var/www/geo-profile-dashboard/.env
   ```

2. Test database connectivity:
   ```bash
   cd /var/www/geo-profile-dashboard
   node -e "require('dotenv').config(); const { createClient } = require('@supabase/supabase-js'); const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); supabase.from('schedules').select('count').then(console.log).catch(console.error)"
   ```

3. Check for JavaScript errors in the log:
   ```bash
   sudo grep "Error" /var/log/schedule-executor.log
   ```

## Best Practices

1. **Security**: Always use the root crontab for jobs that require elevated permissions, such as writing to system log files.

2. **Monitoring**: Consider setting up alerting for failures using a service like Cronitor.

3. **Backup**: Keep a backup of your crontab configuration:
   ```bash
   sudo crontab -l > /var/www/geo-profile-dashboard/crontab-backup.txt
   ```

4. **Log Rotation**: Set up log rotation to prevent logs from consuming too much disk space.

5. **Redundancy**: Consider setting up a secondary cron job with slightly offset timing as a failsafe.
