#!/bin/bash
# This script sets up the environment and runs the schedule executor

# Set app directory path
APP_DIR="/root/geo-profile-dashboard"
LOG_FILE="/var/log/schedule-executor.log"

# Load environment variables from .env file if it exists
if [ -f "$APP_DIR/.env" ]; then
    set -a
    source "$APP_DIR/.env"
    set +a
else
    echo "Error: .env file not found at $APP_DIR/.env" >> $LOG_FILE
    exit 1
fi

# Navigate to the project directory
cd "$APP_DIR" || { echo "Error: Could not change to directory $APP_DIR" >> $LOG_FILE; exit 1; }

# Log start of execution
echo "[$(date)] Starting schedule execution" >> $LOG_FILE

# Run the direct-execute.js script
node scripts/direct-execute.js

# Log exit code
echo "[$(date)] Execution finished with exit code $?" >> $LOG_FILE