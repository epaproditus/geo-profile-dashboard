#!/bin/bash
# This script sets up the environment and runs the schedule executor

# Set the environment variables
export API_URL="http://localhost:3000"  # Change this to your actual API URL
export SCHEDULE_EXECUTOR_API_KEY="YOUR_API_KEY_HERE"  # Set this to your actual API key
export SUPABASE_URL="YOUR_SUPABASE_URL"  # Add if needed
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_KEY"  # Add if needed
export SIMPLEMDM_API_KEY="YOUR_SIMPLEMDM_API_KEY"  # Add if needed

# Navigate to the project directory
cd "$(dirname "$0")"

# Run the execute-schedules.js script
node scripts/execute-schedules.js