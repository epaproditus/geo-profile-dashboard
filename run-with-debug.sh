#!/bin/bash
# filepath: /Users/abe/Documents/VSCode/geo-profile-dashboard/run-with-debug.sh

echo "Starting server with debugging enabled..."

# Export environment variables for debugging
export NODE_DEBUG=dotenv,http
export DEBUG=express:*

# Check if .env file exists
if [ ! -f .env ]; then
  echo "⚠️ Warning: .env file not found! Creating from example..."
  cp .env.example .env
  echo "⚠️ Please edit .env file and add your actual Supabase service role key!"
fi

# Print environment variables without exposing sensitive values
echo "Environment variables status:"
if grep -q "VITE_SUPABASE_URL=" .env; then
  echo "- VITE_SUPABASE_URL: Set in .env file"
  export VITE_SUPABASE_URL=$(grep "VITE_SUPABASE_URL=" .env | cut -d '=' -f2)
else
  echo "- VITE_SUPABASE_URL: NOT SET in .env file"
fi

if grep -q "SUPABASE_URL=" .env; then
  echo "- SUPABASE_URL: Set in .env file"
  export SUPABASE_URL=$(grep "SUPABASE_URL=" .env | cut -d '=' -f2)
elif [ ! -z "$VITE_SUPABASE_URL" ]; then
  echo "- Setting SUPABASE_URL from VITE_SUPABASE_URL"
  export SUPABASE_URL=$VITE_SUPABASE_URL
else
  echo "- SUPABASE_URL: NOT SET in .env file"
fi

if grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env; then
  echo "- SUPABASE_SERVICE_ROLE_KEY: Set in .env file"
  export SUPABASE_SERVICE_ROLE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY=" .env | cut -d '=' -f2)
else
  echo "- SUPABASE_SERVICE_ROLE_KEY: NOT SET in .env file"
fi

if grep -q "PORT=" .env; then
  echo "- PORT: Set in .env file"
  export PORT=$(grep "PORT=" .env | cut -d '=' -f2)
else
  echo "- PORT: Using default (3000)"
fi

# Install required dependencies
echo "Checking for required dependencies..."
npm install --no-save dotenv express @supabase/supabase-js

# Run fix for SimpleMDM routes if that script exists
if [ -f ./fix-simplemdm-routes.sh ]; then
  echo "Running SimpleMDM route fix..."
  ./fix-simplemdm-routes.sh
fi

# Start the server with environment variables properly set
echo "Starting server with environment variables verified..."
node server.js
