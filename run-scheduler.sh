#!/bin/bash
# This script sets up the environment and runs the schedule executor

# Determine the script path and base directory
SCRIPT_PATH="$(readlink -f "$0")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"

# Use script directory by default, or override with explicit path
APP_DIR="${APP_DIR:-$SCRIPT_DIR}"
LOG_FILE="${LOG_FILE:-/var/log/schedule-executor.log}"


echo "Using application directory: $APP_DIR"

# Ensure log directory and file exist and are writable
if [ ! -f "$LOG_FILE" ]; then
    mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
    touch "$LOG_FILE" 2>/dev/null || true
    
    # If we can't create the system log file, use a local one
    if [ ! -f "$LOG_FILE" ] || [ ! -w "$LOG_FILE" ]; then
        LOG_FILE="$APP_DIR/scheduler.log"
        touch "$LOG_FILE"
        echo "Using local log file: $LOG_FILE"
    fi
fi

echo "[$(date)] Starting schedule execution" >> "$LOG_FILE" 2>/dev/null || echo "[$(date)] Starting schedule execution"

# Navigate to the project directory
cd "$APP_DIR" || { echo "Error: Could not change to directory $APP_DIR"; exit 1; }

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo "[$(date)] Loading environment from .env file" >> "$LOG_FILE" 2>/dev/null || echo "[$(date)] Loading environment from .env file"
    set -a
    source ".env"
    set +a
else
    echo "[$(date)] Warning: .env file not found at $APP_DIR/.env" >> "$LOG_FILE" 2>/dev/null || echo "[$(date)] Warning: .env file not found"
fi

# Run the executor.js script with trace warnings
echo "[$(date)] Executing executor.js" >> "$LOG_FILE" 2>/dev/null || echo "[$(date)] Executing executor.js"
NODE_OPTIONS="--trace-warnings" node scripts/executor.js

EXIT_CODE=$?
echo "[$(date)] Execution finished with exit code $EXIT_CODE" >> "$LOG_FILE" 2>/dev/null || echo "[$(date)] Execution finished with exit code $EXIT_CODE"

exit $EXIT_CODE