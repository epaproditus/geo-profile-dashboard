#!/bin/bash
# This script tests the removal of a profile from a device

# Usage: ./test-profile-removal.sh PROFILE_ID DEVICE_ID

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

# Create a temporary schedule for removing the profile
echo "Creating temporary schedule to remove profile ${PROFILE_ID} from device ${DEVICE_ID}..."

# Execute the profile removal directly using the SimpleMDM API
echo "Removing profile ${PROFILE_ID} from device ${DEVICE_ID}..."
curl -s -X DELETE "https://a.simplemdm.com/api/v1/profiles/${PROFILE_ID}/devices/${DEVICE_ID}" \
  -u "${SIMPLEMDM_API_KEY}:" 

# Check HTTP status code
if [ $? -eq 0 ]; then
  echo "Profile removal request sent successfully!"
else
  echo "Error making API request to remove profile"
  exit 1
fi

echo "Done!"
