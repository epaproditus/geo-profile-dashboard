#!/bin/bash
# This script sets up environment variables correctly and runs the executor.js script

# Define path variables
APP_DIR=$(dirname "$0")
LOG_FILE="${APP_DIR}/executor.log"

echo "Starting executor with correct environment variables..."
echo "[$(date)] Starting schedule execution" >> "$LOG_FILE"

# Load environment from .env file
set -a
source "${APP_DIR}/.env"
set +a

# Set correct environment variables for executor
export SUPABASE_URL="${VITE_SUPABASE_URL}"
export SUPABASE_SERVICE_ROLE_KEY="${VITE_SUPABASE_SERVICE_KEY}"
export SIMPLEMDM_API_KEY="${VITE_SIMPLEMDM_API_KEY}"

# Print for debugging (redacting sensitive values)
echo "SUPABASE_URL=${SUPABASE_URL}" >> "$LOG_FILE"
echo "SUPABASE_SERVICE_ROLE_KEY=***" >> "$LOG_FILE"
echo "SIMPLEMDM_API_KEY=***" >> "$LOG_FILE"

# Run the executor script with trace warnings
NODE_OPTIONS="--trace-warnings" node "${APP_DIR}/scripts/executor.js"

EXIT_CODE=$?
echo "[$(date)] Execution finished with exit code $EXIT_CODE" >> "$LOG_FILE"

echo "Executor finished with exit code: $EXIT_CODE"
exit $EXIT_CODE
