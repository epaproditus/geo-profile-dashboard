#!/bin/bash
# /Users/abe/Documents/VSCode/geo-profile-dashboard/fix-recurring-schedules.sh
#
# This script runs the fix-recurring-schedules.js script to ensure
# recurring schedules are properly reset after execution.
# Add this to your crontab to run at regular intervals (e.g., hourly).

# Navigate to the project directory
cd "$(dirname "$0")" || exit 1

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Run the fix-recurring-schedules.js script
node scripts/fix-recurring-schedules.js >> logs/schedule-fix.log 2>&1

exit $?
