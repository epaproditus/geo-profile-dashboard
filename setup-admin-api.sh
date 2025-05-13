#!/bin/bash
# filepath: /Users/abe/Documents/VSCode/geo-profile-dashboard/setup-admin-api.sh

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Creating .env file from example..."
  cp .env.example .env
  echo "⚠️  Please edit .env file and add your actual Supabase service role key!"
  exit 1
fi

# Check if Supabase environment variables are set
if ! grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env || grep -q "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here" .env; then
  echo "⚠️  Please set your SUPABASE_SERVICE_ROLE_KEY in the .env file!"
  exit 1
fi

# Install any missing dependencies if needed
echo "Checking for required dependencies..."
npm install dotenv express @supabase/supabase-js

# Start the server
echo "Starting server..."
node server.js
