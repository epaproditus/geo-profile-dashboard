#!/bin/bash
# This script checks if the quick_profile_assignments table exists in the database

# Change to the project directory
cd "$(dirname "$0")"

# Load environment variables from .env file
if [ -f .env ]; then
  source .env
fi

# Check if SUPABASE_URL and service key are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: Supabase credentials are not set. Please check your .env file."
  exit 1
fi

echo "Checking database for quick_profile_assignments table..."

# Use curl to execute SQL check
curl -s -X POST \
  "$SUPABASE_URL/rest/v1/rpc/does_table_exist" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"table_name": "quick_profile_assignments", "schema_name": "public"}' \
  | grep "true" > /dev/null

if [ $? -eq 0 ]; then
  echo "✅ Table quick_profile_assignments exists!"
else
  echo "❌ Table quick_profile_assignments does not exist. You need to apply the migration."
  echo "Run the following in the Supabase SQL Editor:"
  echo ""
  cat supabase/migrations/20250513200000_add_quick_profile_scheduler.sql
fi
