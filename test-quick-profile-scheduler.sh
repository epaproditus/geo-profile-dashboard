#!/bin/bash
# filepath: /Users/abe/Documents/VSCode/geo-profile-dashboard/test-quick-profile-scheduler.sh
# Script to test the quick profile scheduler functionality

# Set up colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== Quick Profile Scheduler Test =====${NC}"

# Change to the project directory
cd "$(dirname "$0")"

# Load environment variables from .env file
if [ -f .env ]; then
  echo -e "${BLUE}Loading environment variables from .env${NC}"
  source .env
fi

# Check if Supabase URL and API key are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}Error: Missing Supabase credentials in .env file${NC}"
  exit 1
fi

# Check if SimpleMDM API key is set
if [ -z "$SIMPLEMDM_API_KEY" ]; then
  echo -e "${RED}Error: Missing SimpleMDM API key in .env file${NC}"
  exit 1
fi

echo -e "\n${BLUE}Step 1: Check if database table exists${NC}"
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('$SUPABASE_URL', '$SUPABASE_SERVICE_ROLE_KEY');

async function checkTable() {
  const { data, error } = await supabase
    .from('quick_profile_assignments')
    .select('id')
    .limit(1);
  
  if (error) {
    console.error('Error checking table:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Database table exists and is accessible');
  }
}

checkTable();
"

echo -e "\n${BLUE}Step 2: Test database functions${NC}"
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('$SUPABASE_URL', '$SUPABASE_SERVICE_ROLE_KEY');

async function testFunctions() {
  // Test get_quick_profile_assignments function
  console.log('Testing get_quick_profile_assignments function...');
  const { data: assignments, error: getError } = await supabase.rpc('get_quick_profile_assignments');
  
  if (getError) {
    console.error('Error with get_quick_profile_assignments:', getError.message);
    process.exit(1);
  } else {
    console.log('✅ get_quick_profile_assignments function working');
    console.log(`Found ${assignments.length} assignments`);
  }
}

testFunctions();
"

echo -e "\n${BLUE}Step 3: Test profile removal script${NC}"
node scripts/process-quick-profile-removals.js

echo -e "\n${GREEN}✅ Quick Profile Scheduler test completed${NC}"
echo -e "${BLUE}For full testing, try using the UI at /quick-profiles${NC}"
