#!/bin/bash

# Your SimpleMDM API key
API_KEY="yZxvb8OhYMUjaJ0195w25MWVextgBZiR06PEglni3Hzwm0kYBLN6JWaROblK0kwR"

# Device ID for your iPhone
DEVICE_ID="1845292"

# Function to extract and display both IP and location data
get_device_data() {
  echo "Time of check: $(date '+%Y-%m-%d %H:%M:%S')"
  
  # API call to get device information
  response=$(curl -s -u "${API_KEY}:" "https://a.simplemdm.com/api/v1/devices/${DEVICE_ID}")
  
  # Extract the key data points we're interested in
  last_seen=$(echo "$response" | grep -o '"last_seen_at":"[^"]*"' | sed 's/"last_seen_at":"//;s/"//')
  last_seen_ip=$(echo "$response" | grep -o '"last_seen_ip":"[^"]*"' | sed 's/"last_seen_ip":"//;s/"//')
  location_lat=$(echo "$response" | grep -o '"location_latitude":"[^"]*"' | sed 's/"location_latitude":"//;s/"//')
  location_long=$(echo "$response" | grep -o '"location_longitude":"[^"]*"' | sed 's/"location_longitude":"//;s/"//')
  location_updated=$(echo "$response" | grep -o '"location_updated_at":"[^"]*"' | sed 's/"location_updated_at":"//;s/"//')
  
  echo "Device last seen: $last_seen"
  echo "Device last seen IP: $last_seen_ip"
  echo "Location coordinates: $location_lat, $location_long"
  echo "Location last updated: $location_updated"
  echo "-----------------------------------------"
}

echo "=== INITIAL DEVICE DATA ==="
get_device_data

echo ""
echo "Now please perform some action on your iPhone (browse a website, open an app, etc.)"
echo "to trigger a connection to SimpleMDM. This will update the last_seen_ip field."
echo ""
echo "Press Enter when ready to check for updated data..."
read -p ""

echo ""
echo "=== CHECKING FOR UPDATED IP DATA ==="
get_device_data

echo ""
echo "Now we'll request a location update using the location update endpoint"
echo "which will ask the device to send its current GPS coordinates."
echo ""

# Request location update
echo "=== REQUESTING GPS LOCATION UPDATE ==="
curl -s -X POST -u "${API_KEY}:" "https://a.simplemdm.com/api/v1/devices/${DEVICE_ID}/lost_mode/update_location"
echo ""
echo "Waiting 15 seconds for the device to respond with location data..."
sleep 15

echo ""
echo "=== CHECKING FOR UPDATED LOCATION DATA ==="
get_device_data

echo ""
echo "COMPARISON:"
echo "1. IP Address update: Happens whenever the device connects to SimpleMDM (nearly instantaneous)"
echo "2. GPS Location update: Requires a specific request and device response (can take time)"
echo ""
echo "Based on the timestamps above, you can see which method updates more quickly"
