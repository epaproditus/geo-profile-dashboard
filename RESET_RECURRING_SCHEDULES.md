# Recurring Schedule Troubleshooting

## Issue: Recurring Schedules Not Running After First Execution

### Problem
Recurring schedules (like "HI" for profile installation and "BYE" for profile removal) are executed once but don't reset properly for future executions. The `last_executed_at` field is being set but not being reset to `null` after execution.

### Solution Options

#### Option 1: Use the Reset Button in the UI
For executed recurring schedules, a "Reset" button is now available in the UI. Click this button to reset a schedule that has already executed but needs to run again.

#### Option 2: Run the SQL Script Directly
If you have access to the Supabase SQL Editor, you can directly run the SQL commands to fix the schedules:

1. Open the Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `/scripts/reset-schedules.sql`
4. Run the SQL queries

#### Option 3: Use the Update Schedules Script
If you have access to the server and the correct environment variables:

```bash
# Make sure the script is executable
chmod +x scripts/update-schedules-direct.js

# Run with environment variables
SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_ROLE_KEY=your-service-role-key node scripts/update-schedules-direct.js
```

#### Option 4: Setup Automated Fixing with Cron
For a long-term automated solution, use the provided shell script with cron:

```bash
# Make the script executable
chmod +x fix-recurring-schedules.sh

# Edit crontab
crontab -e

# Add this line to run every hour
0 * * * * /path/to/fix-recurring-schedules.sh
```

## Long-Term Fix

The root cause is in the executor.js file, which needs to correctly reset the `last_executed_at` field to `null` for recurring schedules after calculating and setting the next execution time.

The fix has been implemented for new schedules, but existing schedules with non-null `last_executed_at` values need to be manually reset using one of the methods above.

## Affected Schedules

- "HI" (Profile Installation): ID `3f4d0b72-39d7-406e-a411-59de832f13e6`
- "BYE" (Profile Removal): ID `3cddcb90-8fbf-4355-9895-0dea7032f6c0`
