#!/bin/bash
# This script uses the update-schedules-direct.js to fix the recurring schedules
# that aren't running correctly.

# Define colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=======================================${NC}"
echo -e "${YELLOW}  Fixing Recurring Schedules          ${NC}"
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

echo -e "${GREEN}Running update-schedules-direct.js to fix recurring schedules...${NC}"
node scripts/update-schedules-direct.js

# Check if the script executed successfully
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Recurring schedules have been fixed successfully!${NC}"
  echo -e "${YELLOW}The following schedules have been reset:${NC}"
  echo "  - HI (Profile Installation)"
  echo "  - BYE (Profile Removal)"
  echo 
  echo -e "${GREEN}The schedules will run at their usual times tomorrow.${NC}"
else
  echo -e "${RED}Error: Failed to fix recurring schedules${NC}"
  echo "Check the error messages above for more details."
  exit 1
fi

echo -e "${YELLOW}=======================================${NC}"
echo -e "${GREEN}To verify the schedules, you can:${NC}"
echo "1. Check the database in the Supabase dashboard"
echo "2. Wait for the scheduled time tomorrow to see if profiles are installed/removed"
echo -e "${YELLOW}=======================================${NC}"

exit 0
