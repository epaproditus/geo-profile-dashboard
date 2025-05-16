#!/bin/bash
# This script checks the status of the HI and BYE recurring schedules

# Define colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=======================================${NC}"
echo -e "${YELLOW}  Checking HI and BYE Schedules        ${NC}"
echo -e "${YELLOW}=======================================${NC}"

# Determine the script path and base directory
SCRIPT_PATH="$(readlink -f "$0")"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"

# Go to the project directory
cd "$SCRIPT_DIR" || { 
  echo -e "${RED}Error: Could not change to directory $SCRIPT_DIR${NC}"
  exit 1
}

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo -e "${RED}Error: .env file not found in $SCRIPT_DIR${NC}"
  echo "Please create an .env file with the required credentials:"
  echo "SUPABASE_URL=https://your-project.supabase.co"
  echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
  exit 1
fi

# Load environment variables
echo -e "${GREEN}Loading environment variables...${NC}"
set -a
source .env
set +a

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}Error: Required environment variables are missing${NC}"
  echo "Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file"
  exit 1
fi

echo -e "${GREEN}Running check-hi-bye-schedules.js to diagnose schedule status...${NC}"
echo

node scripts/check-hi-bye-schedules.js

# Check if the script executed successfully
if [ $? -eq 0 ]; then
  echo -e "${YELLOW}=======================================${NC}"
  echo -e "${GREEN}Next steps:${NC}"
  echo "1. If schedules are not eligible for execution, run the fix script:"
  echo "   ./fix-hi-bye-schedules.sh"
  echo "2. To ensure schedules are fixed automatically, set up a daily cron job:"
  echo "   0 0 * * * $SCRIPT_DIR/fix-hi-bye-schedules.sh >> $SCRIPT_DIR/logs/schedule-fix.log 2>&1"
else
  echo -e "${RED}Error: Failed to check schedules${NC}"
  echo "Check the error messages above for more details."
  exit 1
fi

exit 0
