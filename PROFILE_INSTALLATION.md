# Near-Immediate Profile Installation System

This document explains how the "near-immediate" profile installation system works in the Geo Profile Dashboard.

## Overview

When you deploy a profile to a device, the system now works as follows:

1. Instead of calling the SimpleMDM API directly from the frontend UI, we create a schedule entry for execution within 1 minute
2. The `executor.js` script runs every minute and picks up these scheduled actions
3. This approach provides several benefits:
   - Consistent execution path (all actions go through the same code)
   - Complete audit trail in the API logs
   - Improved error handling and retry capabilities
   - Support for temporary profile installations

## Temporary Profile Installation

Temporary profile installations are implemented through a pair of scheduled actions:

1. A "push_profile" schedule to install the profile immediately (within 1 minute)
2. A "remove_profile" schedule to automatically remove the profile after the specified duration

You can see these paired schedules using the SQL query in `supabase/migrations/schedule_monitoring.sql`.

## Monitoring Scheduled Profile Operations

To monitor scheduled profile operations, you can use the following SQL queries:

1. View all scheduled profiles with their status:
```sql
SELECT 
  id,
  profile_id,
  device_id,
  action_type,
  start_time,
  created_at,
  last_executed_at,
  ui_initiated,
  CASE 
    WHEN last_executed_at IS NULL AND start_time > NOW() THEN 'Pending'
    WHEN last_executed_at IS NULL AND start_time <= NOW() THEN 'Due for execution'
    WHEN last_executed_at IS NOT NULL THEN 'Executed'
    ELSE 'Unknown'
  END as status
FROM 
  schedules
WHERE 
  action_type IN ('push_profile', 'remove_profile')
ORDER BY 
  created_at DESC
LIMIT 50;
```

2. View paired temporary profile installations:
```sql
SELECT 
  s1.id as install_id,
  s2.id as remove_id,
  s1.profile_id,
  s1.device_id,
  s1.start_time as install_time,
  s1.last_executed_at as installed_at,
  s2.start_time as scheduled_removal_time,
  s2.last_executed_at as removed_at,
  EXTRACT(EPOCH FROM (s2.start_time - s1.start_time))/60 as duration_minutes
FROM 
  schedules s1
JOIN 
  schedules s2 ON s1.profile_id = s2.profile_id AND s1.device_id = s2.device_id AND s2.id > s1.id
WHERE 
  s1.action_type = 'push_profile' 
  AND s2.action_type = 'remove_profile'
  AND s1.start_time < s2.start_time
ORDER BY 
  s1.created_at DESC
LIMIT 20;
```

## How It Differs from Direct API Calls

Previously, profile installations were executed in two different ways:

1. UI-initiated installations: Direct API calls from the frontend, bypassing the executor.js script and creating no API logs
2. Scheduled installations: Handled by executor.js with full logging

Now, all profile operations go through the executor.js script, ensuring consistent behavior and complete audit trails.

## Crontab Configuration

The scheduler must now run every minute to support near-immediate profile installations:

```
# Run the geo-profile-dashboard scheduler every minute for quick profile actions
* * * * * /var/www/geo-profile-dashboard/run-scheduler.sh
```
