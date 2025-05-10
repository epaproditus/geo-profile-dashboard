#!/bin/bash
# This script tests scheduling a profile removal using the scheduler executor

# Usage: ./test-schedule-profile-removal.sh PROFILE_ID DEVICE_ID

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 PROFILE_ID DEVICE_ID"
  exit 1
fi

PROFILE_ID=$1
DEVICE_ID=$2

# Load API key from .env file
if [ -f ".env" ]; then
  source .env
else
  echo "Error: .env file not found"
  exit 1
fi

if [ -z "$SIMPLEMDM_API_KEY" ]; then
  echo "Error: SIMPLEMDM_API_KEY not set in .env file"
  exit 1
fi

# Current timestamp in ISO format
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create a temporary schedule record in the database
echo "Creating temporary schedule to remove profile ${PROFILE_ID} from device ${DEVICE_ID}..."

# Generate a unique ID for this test
TEST_ID=$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]' | head -c 10)

# Connect to the database and insert a test schedule
# Note: This assumes you have the database connection details in your .env file
# and the psql client installed
psql "$DATABASE_URL" << EOF
INSERT INTO schedules (
  name, 
  description, 
  profile_id,
  device_filter,
  schedule_type,
  start_time,
  timezone,
  enabled,
  action_type,
  assignment_group_id
) VALUES (
  'Test Profile Removal ${TEST_ID}',
  'Test scheduled profile removal via test script',
  '${PROFILE_ID}',
  '{"nameContains":"${DEVICE_ID}"}',
  'one_time',
  '${NOW}',
  'UTC',
  true,
  'remove_profile',
  1
) RETURNING id;
EOF

echo "Schedule created. Running executor to process it..."

# Run the executor
node scripts/executor.js

echo "Done! Check logs for results."
