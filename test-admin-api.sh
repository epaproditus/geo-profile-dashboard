#!/bin/bash
# filepath: /Users/abe/Documents/VSCode/geo-profile-dashboard/test-admin-api.sh

# Print header
echo "====================================="
echo "Testing Admin API Endpoint"
echo "====================================="

# Check if server is running
if ! curl -s http://localhost:8080 > /dev/null; then
  # Try another common port
  if ! curl -s http://localhost:3000 > /dev/null; then
    echo "⚠️ Server does not appear to be running on port 8080 or 3000"
    echo "Please start the server with: ./setup-admin-api.sh"
    exit 1
  else
    PORT=3000
  fi
else
  PORT=8080
fi

echo "Server detected on port $PORT"
echo ""

# Check if jq is installed for JSON formatting
if command -v jq &> /dev/null; then
  HAS_JQ=true
else
  HAS_JQ=false
  echo "Note: Install jq for prettier JSON output: brew install jq"
fi

# Test 1: Test the endpoint with invalid input
echo "Test 1: Testing with invalid input (missing userId)"
if [ "$HAS_JQ" = true ]; then
  curl -s -X POST http://localhost:$PORT/api/auth/set-admin-status \
    -H "Content-Type: application/json" \
    -d '{"isAdmin":true}' | jq
else
  curl -s -X POST http://localhost:$PORT/api/auth/set-admin-status \
    -H "Content-Type: application/json" \
    -d '{"isAdmin":true}'
fi
echo ""

# Test 2: Ask for a user ID to test with
echo "Test 2: Testing with valid input"
echo "Enter a valid user ID from your Supabase database:"
read USER_ID

if [ -z "$USER_ID" ]; then
  echo "No user ID provided, skipping this test"
else
  echo "Setting admin status to true for user $USER_ID"
  if [ "$HAS_JQ" = true ]; then
    curl -s -X POST http://localhost:$PORT/api/auth/set-admin-status \
      -H "Content-Type: application/json" \
      -d "{\"userId\":\"$USER_ID\",\"isAdmin\":true}" | jq
  else
    curl -s -X POST http://localhost:$PORT/api/auth/set-admin-status \
      -H "Content-Type: application/json" \
      -d "{\"userId\":\"$USER_ID\",\"isAdmin\":true}"
  fi
  
  echo ""
  echo "Setting admin status to false for user $USER_ID"
  if [ "$HAS_JQ" = true ]; then
    curl -s -X POST http://localhost:$PORT/api/auth/set-admin-status \
      -H "Content-Type: application/json" \
      -d "{\"userId\":\"$USER_ID\",\"isAdmin\":false}" | jq
  else
    curl -s -X POST http://localhost:$PORT/api/auth/set-admin-status \
      -H "Content-Type: application/json" \
      -d "{\"userId\":\"$USER_ID\",\"isAdmin\":false}"
  fi
fi

echo ""
echo "====================================="
echo "Testing Complete"
echo "If you encountered errors, please check:"
echo "1. Is the server running?"
echo "2. Are environment variables properly set?"
echo "3. Is the user ID valid?"
echo ""
echo "For more troubleshooting, see: ADMIN_API_TROUBLESHOOTING.md"
echo "====================================="
