#!/bin/bash
# Verification script for Geo Profile Dashboard deployment
# This script tests various components of the deployment to ensure everything is working

echo "==========================================="
echo "  Geo Profile Dashboard Verification Test  "
echo "==========================================="
echo

# Default deployment path
DEPLOY_PATH="${1:-/var/www/geo-profile-dashboard}"
LOG_FILE="$DEPLOY_PATH/scheduler.log"

# Check if deployment exists
if [ ! -d "$DEPLOY_PATH" ]; then
    echo "❌ Deployment directory not found at $DEPLOY_PATH"
    exit 1
else
    echo "✅ Deployment directory found at $DEPLOY_PATH"
fi

# Check if .env file exists
if [ ! -f "$DEPLOY_PATH/.env" ]; then
    echo "❌ Environment file (.env) not found"
    exit 1
else
    echo "✅ Environment file (.env) exists"
fi

# Check if built application exists
if [ ! -d "$DEPLOY_PATH/dist" ]; then
    echo "❌ Built application (dist folder) not found"
    exit 1
else
    echo "✅ Built application exists"
fi

# Check if required scripts are executable
if [ ! -x "$DEPLOY_PATH/run-scheduler.sh" ]; then
    echo "❌ run-scheduler.sh is not executable"
    exit 1
else
    echo "✅ run-scheduler.sh is executable"
fi

if [ ! -x "$DEPLOY_PATH/scripts/executor.js" ]; then
    echo "❌ executor.js is not executable"
    exit 1
else
    echo "✅ executor.js is executable"
fi

if [ ! -x "$DEPLOY_PATH/rotate-logs.sh" ]; then
    echo "❌ rotate-logs.sh is not executable"
    exit 1
else
    echo "✅ rotate-logs.sh is executable"
fi

if [ ! -x "$DEPLOY_PATH/backup-db.sh" ]; then
    echo "❌ backup-db.sh is not executable"
    exit 1
else
    echo "✅ backup-db.sh is executable"
fi

# Check if PM2 is running the application
if ! pm2 list | grep -q "geo-profile-dashboard"; then
    echo "❌ Application is not running in PM2"
else
    echo "✅ Application is running in PM2"
fi

# Check if the application is accessible
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200"; then
    echo "❌ Application is not accessible on port 8080"
else
    echo "✅ Application is accessible on port 8080"
fi

# Check if cron job is set up
if ! crontab -l 2>/dev/null | grep -q "$DEPLOY_PATH/run-scheduler.sh"; then
    echo "❌ Cron job not found in crontab"
else
    echo "✅ Cron job is configured"
fi

# Check if log file exists
if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Log file not found at $LOG_FILE"
else
    echo "✅ Log file exists at $LOG_FILE"
fi

# Check for permissions on log file
if [ -f "$LOG_FILE" ] && [ ! -w "$LOG_FILE" ]; then
    echo "❌ Log file is not writable"
else
    echo "✅ Log file has correct permissions"
fi

# Check environment variables
cd "$DEPLOY_PATH"
MISSING_VARS=0

echo -n "Checking environment variables: "

# Use node to check for environment variables
NODE_CHECK=$(node -e '
const dotenv = require("dotenv");
dotenv.config();
const required = [
  "SUPABASE_URL", 
  "SUPABASE_SERVICE_ROLE_KEY", 
  "SIMPLEMDM_API_KEY"
];
const missing = required.filter(v => !process.env[v]);
console.log(JSON.stringify({
  missing: missing,
  count: missing.length
}));
')

MISSING_COUNT=$(echo $NODE_CHECK | grep -o '"count":[0-9]*' | cut -d ':' -f 2)
MISSING_LIST=$(echo $NODE_CHECK | grep -o '"missing":\[[^]]*\]' | cut -d ':' -f 2)

if [ "$MISSING_COUNT" -gt 0 ]; then
    echo "❌ Missing required environment variables: $MISSING_LIST"
    MISSING_VARS=1
else
    echo "✅ All required environment variables are set"
fi

# Test Supabase connection
echo -n "Testing Supabase connection: "
SUPABASE_TEST=$(node -e '
const dotenv = require("dotenv");
dotenv.config();
const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log(JSON.stringify({ success: false, error: "Missing credentials" }));
  process.exit(0);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

supabase.from("schedules").select("count").then(result => {
  console.log(JSON.stringify({ success: !result.error, error: result.error }));
}).catch(error => {
  console.log(JSON.stringify({ success: false, error: error.message }));
});
' 2>/dev/null)

SUPABASE_SUCCESS=$(echo $SUPABASE_TEST | grep -o '"success":[a-z]*' | cut -d ':' -f 2)

if [ "$SUPABASE_SUCCESS" == "true" ]; then
    echo "✅ Successfully connected to Supabase"
else
    SUPABASE_ERROR=$(echo $SUPABASE_TEST | grep -o '"error":"[^"]*"' | cut -d ':' -f 2 | tr -d '"')
    echo "❌ Failed to connect to Supabase: $SUPABASE_ERROR"
fi

# Test scheduler
echo -n "Testing scheduler execution: "
if [ -f "$LOG_FILE" ]; then
    # Run the scheduler with output to a temporary file
    TEST_LOG=$(mktemp)
    "$DEPLOY_PATH/run-scheduler.sh" > "$TEST_LOG" 2>&1
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ Scheduler executed successfully"
    else
        echo "❌ Scheduler execution failed with exit code $EXIT_CODE"
        echo "Error details:"
        cat "$TEST_LOG"
    fi
    
    rm "$TEST_LOG"
else
    echo "❌ Cannot test scheduler because log file does not exist"
fi

# Check if Cloudflare Tunnel is running (if installed)
if command -v cloudflared >/dev/null 2>&1; then
    echo -n "Checking Cloudflare Tunnel: "
    if systemctl is-active --quiet cloudflared; then
        echo "✅ Cloudflare Tunnel service is running"
    else
        echo "❌ Cloudflare Tunnel service is not running"
    fi
else
    echo "ℹ️  Cloudflare Tunnel is not installed"
fi

# Summary
echo
echo "==========================================="
echo "  Verification Summary                    "
echo "==========================================="

# Count failures
FAILURES=0
if [ ! -d "$DEPLOY_PATH" ] || [ ! -f "$DEPLOY_PATH/.env" ] || [ ! -d "$DEPLOY_PATH/dist" ]; then
    FAILURES=$((FAILURES+1))
fi

if [ ! -x "$DEPLOY_PATH/run-scheduler.sh" ] || [ ! -x "$DEPLOY_PATH/scripts/executor.js" ] || [ ! -x "$DEPLOY_PATH/rotate-logs.sh" ] || [ ! -x "$DEPLOY_PATH/backup-db.sh" ]; then
    FAILURES=$((FAILURES+1))
fi

if ! pm2 list | grep -q "geo-profile-dashboard" || ! curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200"; then
    FAILURES=$((FAILURES+1))
fi

if ! crontab -l 2>/dev/null | grep -q "$DEPLOY_PATH/run-scheduler.sh" || [ ! -f "$LOG_FILE" ] || ([ -f "$LOG_FILE" ] && [ ! -w "$LOG_FILE" ]); then
    FAILURES=$((FAILURES+1))
fi

if [ "$MISSING_VARS" -eq 1 ] || [ "$SUPABASE_SUCCESS" != "true" ]; then
    FAILURES=$((FAILURES+1))
fi

if [ $FAILURES -eq 0 ]; then
    echo "✅ All tests passed! The deployment appears to be working correctly."
    echo
    echo "You can now access your application at: http://localhost:8080"
    echo "If you've set up Cloudflare Tunnel, use your configured domain."
    echo
    echo "For ongoing maintenance, refer to MONITORING.md"
else
    echo "❌ Some tests failed. Please address the issues noted above."
    echo
    echo "For troubleshooting guidance, refer to the documentation files:"
    echo "- DEPLOYMENT.md"
    echo "- CRON_SETUP.md"
    echo "- MONITORING.md"
    echo "- DB_MIGRATION.md"
fi

exit $FAILURES
