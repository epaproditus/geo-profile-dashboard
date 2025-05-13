#!/bin/bash
# filepath: /Users/abe/Documents/VSCode/geo-profile-dashboard/setup-admin-api.sh

# Print header
echo "====================================="
echo "Geo Profile Dashboard - Admin API Setup"
echo "====================================="

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Creating .env file from example..."
  cp .env.example .env
  echo "⚠️  Please edit .env file and add your actual Supabase service role key!"
  echo "   - Open the .env file: nano .env"
  echo "   - Replace your-service-role-key-here with your actual key"
  exit 1
fi

# Check if Supabase environment variables are set
if ! grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env || grep -q "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here" .env; then
  echo "⚠️  Please set your SUPABASE_SERVICE_ROLE_KEY in the .env file!"
  echo "   - Open the .env file: nano .env"
  echo "   - Replace your-service-role-key-here with your actual key"
  exit 1
fi

# Check if SUPABASE_URL is set
if ! grep -q "SUPABASE_URL=" .env; then
  echo "Adding SUPABASE_URL to .env file..."
  # If VITE_SUPABASE_URL exists, use its value
  if grep -q "VITE_SUPABASE_URL=" .env; then
    VITE_URL=$(grep "VITE_SUPABASE_URL=" .env | cut -d '=' -f2)
    echo "SUPABASE_URL=$VITE_URL" >> .env
    echo "Added SUPABASE_URL from VITE_SUPABASE_URL"
  else
    echo "⚠️  Please set your SUPABASE_URL in the .env file!"
    echo "SUPABASE_URL=https://your-project.supabase.co" >> .env
    echo "   - Open the .env file: nano .env"
    echo "   - Replace the placeholder URL with your actual Supabase URL"
    exit 1
  fi
fi

# Install any missing dependencies if needed
echo "Checking for required dependencies..."
npm install dotenv express @supabase/supabase-js

# Fix SimpleMDM routes if needed
if [ -f ./api/simplemdm/\[\...\path\].js ]; then
  echo "Running SimpleMDM routes fix..."
  if [ -f ./fix-simplemdm-routes.sh ]; then
    chmod +x ./fix-simplemdm-routes.sh
    ./fix-simplemdm-routes.sh
  else
    echo "⚠️ SimpleMDM fix script not found. This might cause issues with SimpleMDM routes."
  fi
fi

# Verify environment variables before starting
echo "Verifying environment variables..."
echo "- SUPABASE_URL: $(grep "SUPABASE_URL=" .env | cut -d '=' -f2 | head -c 10)..."
echo "- SUPABASE_SERVICE_ROLE_KEY: $(grep "SUPABASE_SERVICE_ROLE_KEY=" .env | cut -d '=' -f2 | head -c 5)..."
echo "- Port: $(grep "PORT=" .env | cut -d '=' -f2 || echo 3000)"

# Show available admin management scripts
echo ""
echo "Available admin management scripts:"
echo "- Debug server with environment variables: ./run-with-debug.sh"
echo "- Sync admin fields for existing users: node scripts/sync-admin-fields.js"
echo "- Fix admin fields directly (advanced): node scripts/fix-admin-fields-direct.js"
echo ""

# Start the server
echo "Starting server..."
node server.js
