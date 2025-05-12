#!/bin/bash
# This script tests scheduling a profile installation with automatic removal

# Usage: ./test-schedule-install-auto-remove.sh PROFILE_ID DEVICE_ID

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

# Current timestamp for installation (now)
INSTALL_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Removal time (2 minutes after installation)
REMOVE_TIME=$(date -u -v+2M +"%Y-%m-%dT%H:%M:%SZ")

# Generate a unique ID for this test
TEST_ID=$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]' | head -c 10)
echo "Test ID: ${TEST_ID}"
echo "Installation time: ${INSTALL_TIME}"
echo "Removal time: ${REMOVE_TIME}"

# Connect to the database and insert TWO test schedules
# 1. The installation schedule
echo "Creating installation schedule for profile ${PROFILE_ID} to device ${DEVICE_ID}..."
INSTALL_ID=$(psql "$DATABASE_URL" -t << EOF
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
  'Test Profile Install/Remove ${TEST_ID} - Install',
  'Test scheduled profile installation with auto-removal via test script',
  '${PROFILE_ID}',
  '{"nameContains":"${DEVICE_ID}"}',
  'one_time',
  '${INSTALL_TIME}',
  'UTC',
  true,
  'push_profile',
  NULL
) RETURNING id;
EOF
)
INSTALL_ID=$(echo $INSTALL_ID | xargs)
echo "Installation schedule created with ID: ${INSTALL_ID}"

# 2. The removal schedule
echo "Creating removal schedule for profile ${PROFILE_ID} from device ${DEVICE_ID}..."
REMOVE_ID=$(psql "$DATABASE_URL" -t << EOF
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
  'Test Profile Install/Remove ${TEST_ID} - Remove',
  'Auto-removal part of test scheduled profile installation',
  '${PROFILE_ID}',
  '{"nameContains":"${DEVICE_ID}"}',
  'one_time',
  '${REMOVE_TIME}',
  'UTC',
  true,
  'remove_profile',
  NULL
) RETURNING id;
EOF
)
REMOVE_ID=$(echo $REMOVE_ID | xargs)
echo "Removal schedule created with ID: ${REMOVE_ID}"

echo "Both schedules created. Run executor manually to process them or wait for scheduled execution."
echo ""
echo "For immediate execution, run:"
echo "node scripts/executor.js"
echo ""
echo "To monitor schedule status, run:"
echo "psql \"$DATABASE_URL\" -c \"SELECT id, name, action_type, start_time, last_executed_at FROM schedules WHERE id IN ('$INSTALL_ID', '$REMOVE_ID');\""
