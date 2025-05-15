#!/bin/bash
# Test script for ntfy.sh notifications
# Usage: ./test-ntfy.sh [message]

# Load environment variables from .env file
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found"
  exit 1
fi

# Set default values if not in env
NTFY_SERVER=${NTFY_SERVER:-https://ntfy.sh}
NTFY_TOPIC=${NTFY_TOPIC:-geo-profile-dashboard}

# Use provided message or default
MESSAGE=${1:-"Test notification from geo-profile-dashboard"}

echo "Sending test notification to ${NTFY_SERVER}/${NTFY_TOPIC}"
echo "Message: ${MESSAGE}"

# Send notification using curl
curl -s \
  -H "Title: Test Notification" \
  -H "Priority: 3" \
  -H "Tags: test,phone" \
  -d "${MESSAGE}" \
  "${NTFY_SERVER}/${NTFY_TOPIC}"

# Check if the curl command was successful
if [ $? -eq 0 ]; then
  echo "Notification sent successfully!"
  echo "To receive notifications, make sure you've subscribed to:"
  echo "- Server: ${NTFY_SERVER}"
  echo "- Topic: ${NTFY_TOPIC}"
  echo "See NOTIFICATIONS.md for detailed setup instructions."
else
  echo "Error sending notification. Check your network connection and server settings."
fi
