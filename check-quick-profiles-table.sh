#!/bin/bash

# Get environment variables
source .env

# Run SQL query to check if table exists
psql "$SUPABASE_DB_URL" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quick_profile_assignments');"
