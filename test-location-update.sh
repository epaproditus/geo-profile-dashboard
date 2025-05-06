#!/bin/bash

# Replace with your SimpleMDM API key and device ID
API_KEY="your_api_key" # You'll need to update this
DEVICE_ID="1234" # You'll need to update this with a real device ID

# Function to get device data and extract location information
get_device_location() {
  echo "Time of API call: $(date)"
  
  # API call to get device information
  response=$(curl -s -u "$API_KEY:" "https://a.simplemdm.com/api/v1/devices/$DEVICE_ID")
  
  # Extract location data using grep and sed
  location_lat=$(echo "$response" | grep -o '"location_latitude":"[^"]*"' | sed 's/"location_latitude":"//;s/"//')
  location_long=$(echo "$response" | grep -o '"location_longitude":"[^"]*"' | sed 's/"location_longitude":"//;s/"//')
  location_updated=$(echo "$response" | grep -o '"location_updated_at":"[^"]*"' | sed 's/"location_updated_at":"//;s/"//')
  last_seen=$(echo "$response" | grep -o '"last_seen_at":"[^"]*"' | sed 's/"last_seen_at":"//;s/"//')
  
  echo "location_latitude: $location_lat"
  echo "location_longitude: $location_long"
  
  echo "location_updated_at: $location_updated"
  echo "last_seen_at: $last_seen"
  echo "-----------------------------------------"
}

echo "=== FIRST API CALL ==="
get_device_location

echo ""
echo "Waiting 1 minute before making second API call..."
echo "This will test if simply querying the device updates the location_updated_at timestamp"
echo ""

# Wait for 1 minute
sleep 60

echo "=== SECOND API CALL (after 1 minute) ==="
get_device_location

echo ""
echo "If the location_updated_at timestamp is the same in both calls,"
echo "it means that simply querying the device does NOT update the location."
echo ""
echo "If the timestamps are different, then querying DOES update the location."
