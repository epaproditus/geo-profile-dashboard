# Recurring Schedules Root Cause Analysis and Fix

## Issue Summary
The recurring schedules "HI" and "BYE" were not automatically resetting after execution, requiring manual intervention to run each day.

## Root Cause Analysis
After carefully examining the code, I've identified several potential causes for this issue:

1. **Missing Schedule Type or Recurrence Pattern** (80% confidence)  
   The code in `executor.js` only updates the `start_time` and resets `last_executed_at` if both the `schedule_type` is 'recurring' AND the `recurrence_pattern` field is set.
   ```javascript
   if (schedule.schedule_type === 'recurring' && schedule.recurrence_pattern) {
     // This code resets the schedule for the next day
   }
   ```
   If either of these conditions is not met, the schedule would be executed once but not reset for the next day.

2. **Error in Next Time Calculation** (60% confidence)  
   The `calculateNextExecutionTime` function could be failing for these specific schedules, either returning null or throwing an error that wasn't being caught.

3. **Database Update Error** (40% confidence)  
   There might be errors occurring during the database update operation that weren't being properly logged.

## Implemented Fixes

I've implemented several improvements to fix these issues:

### 1. Enhanced `update-schedules-direct.js`
Modified this script to ensure all necessary fields for recurring schedules are properly set:
- Now ensures `schedule_type` is set to 'recurring'
- Now ensures `recurrence_pattern` exists (default 'daily' if missing)
- Added detailed logging of the update data

### 2. Improved Error Handling in `executor.js`
Added robust error handling around the recurring schedule update logic:
- Added try/catch around the next execution time calculation
- Added a fallback mechanism if calculation fails or returns null
- Improved logging of all operations with detailed error messages
- Added warnings for improperly configured schedules

### 3. Created New Diagnostic Script
Created `check-hi-bye-schedules.js` and wrapper `check-schedules.sh` to:
- Check the current status of the "HI" and "BYE" schedules
- Verify if they are eligible for execution
- Provide detailed diagnostics about why they might not be running
- Give guidance on fixing issues

## Recommended Long-Term Solution
While the immediate fixes should resolve the issues, I recommend:

1. **Configure a Daily Cron Job**  
   Set up a cron job to run the `fix-hi-bye-schedules.sh` script daily:
   ```
   0 0 * * * /path/to/geo-profile-dashboard/fix-hi-bye-schedules.sh >> /path/to/geo-profile-dashboard/logs/schedule-fix.log 2>&1
   ```
   This ensures the schedules are reset properly every day, even if other issues arise.

2. **Regular Monitoring**  
   Use the `check-schedules.sh` script to periodically verify the schedules are properly configured:
   ```
   0 12 * * * /path/to/geo-profile-dashboard/check-schedules.sh >> /path/to/geo-profile-dashboard/logs/schedule-check.log 2>&1
   ```

## Verification Steps
After implementing these fixes, you should:

1. Run `./check-schedules.sh` to verify the current status of the schedules
2. Run `./fix-hi-bye-schedules.sh` to reset the schedules if needed
3. Wait for the scheduled execution times to ensure the profiles are installed/removed
4. Set up the recommended cron job for ongoing maintenance

## Confidence in Solution
Based on the code analysis, I have 80% confidence that the primary issue is with missing or incorrect `schedule_type` or `recurrence_pattern` fields, which our fix addresses directly. The additional error handling and diagnostics provide protection against other potential causes.
