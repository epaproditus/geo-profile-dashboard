#!/bin/bash
# Script to backup Supabase database (if using local Supabase setup)
# For hosted Supabase, please use their backup features instead

BACKUP_DIR="/var/www/geo-profile-dashboard/backups"
DATE=$(date +"%Y-%m-%d")
DB_NAME="postgres"  # Default Supabase database name
BACKUP_FILE="${BACKUP_DIR}/supabase-backup-${DATE}.sql"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Load environment variables
source /var/www/geo-profile-dashboard/.env

# Check for Supabase local setup
if [ -d "/var/www/geo-profile-dashboard/supabase" ]; then
  echo "Local Supabase setup detected. Starting backup..."
  
  # Use supabase CLI for backup if available
  if command -v supabase &> /dev/null; then
    cd /var/www/geo-profile-dashboard
    supabase db dump -f "$BACKUP_FILE"
  else
    # Fallback to pg_dump if supabase CLI is not available
    echo "Supabase CLI not found. Using pg_dump..."
    
    # Get connection details from environment variables
    DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/postgres}"
    
    # Run pg_dump
    pg_dump "$DB_URL" > "$BACKUP_FILE"
  fi
  
  # Compress the backup
  gzip -f "$BACKUP_FILE"
  
  # Report status
  if [ -f "${BACKUP_FILE}.gz" ]; then
    echo "Backup completed successfully: ${BACKUP_FILE}.gz"
    
    # Remove backups older than 30 days
    find "$BACKUP_DIR" -name "supabase-backup-*.sql.gz" -mtime +30 -delete
    echo "Cleaned up old backups."
  else
    echo "ERROR: Backup failed!"
    exit 1
  fi
else
  echo "This appears to be using a hosted Supabase instance."
  echo "Please use Supabase's built-in backup functionality instead."
  echo "See: https://supabase.com/docs/guides/platform/backups"
fi
