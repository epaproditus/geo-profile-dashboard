#!/bin/bash
# This script runs the quick profile removal processor

# Change to the project directory
cd "$(dirname "$0")"

# Load environment variables from .env file
if [ -f .env ]; then
  source .env
fi

# Check if NODE_ENV is set, if not default to development
if [ -z "$NODE_ENV" ]; then
  NODE_ENV="development"
fi

echo "===== Running Quick Profile Removal Processor ====="
echo "Environment: $NODE_ENV"
echo "Time: $(date)"

# Run the script with the correct Node.js environment
node scripts/process-quick-profile-removals.js

# Log the completion status
if [ $? -eq 0 ]; then
  echo "Quick profile removal processor completed successfully"
else
  echo "Quick profile removal processor failed with error code $?"
fi

echo "===== Finished at $(date) ====="
echo ""
