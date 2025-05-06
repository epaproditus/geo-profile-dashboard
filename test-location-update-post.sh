#!/bin/bash

# Your SimpleMDM API key
API_KEY="yZxvb8OhYMUjaJ0195w25MWVextgBZiR06PEglni3Hzwm0kYBLN6JWaROblK0kwR"

# Device ID for your iPhone
DEVICE_ID="1845292"

# Step 1: Check current location data
echo "=== CHECKING CURRENT LOCATION DATA ==="
curl -s -u "${API_KEY}:" "https://a.simplemdm.com/api/v1/devices/${DEVICE_ID}" | grep -E 'location_latitude|location_longitude|location_accuracy|location_updated_at|last_seen_at'

# Step 2: Request a location update using the lost_mode endpoint
echo -e "\n=== REQUESTING LOCATION UPDATE ==="
curl -s -X POST -u "${API_KEY}:" "https://a.simplemdm.com/api/v1/devices/${DEVICE_ID}/lost_mode/update_location"

# Step 3: Wait a few seconds for the device to update its location
echo -e "\n=== WAITING 10 SECONDS FOR DEVICE TO RESPOND ==="
for i in {1..10}; do
  echo -n "."
  sleep 1
done
echo ""

# Step 4: Check if the location data has been updated
echo -e "\n=== CHECKING UPDATED LOCATION DATA ==="
curl -s -u "${API_KEY}:" "https://a.simplemdm.com/api/v1/devices/${DEVICE_ID}" | grep -E 'location_latitude|location_longitude|location_accuracy|location_updated_at|last_seen_at'

