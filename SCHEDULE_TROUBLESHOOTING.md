# Schedule Troubleshooting Guide

## Common Issues

### Recurring Schedules Not Running Again

#### Issue
Recurring schedules have a `last_executed_at` timestamp but don't automatically get rescheduled for the next execution.

#### Cause
There's an issue in the scheduler code where recurring schedules don't always get properly reset after execution. 
For recurring schedules, when they are executed:
1. The `last_executed_at` field should be initially set to the current time
2. The system should calculate the next execution time
3. The `start_time` should be updated to this new time
4. The `last_executed_at` should be reset to null so it will be picked up for the next run

If step 4 doesn't happen, the schedule won't run again.

#### Solution
Two solutions are available:

1. **Manual Reset**: Use the "Reset" button in the UI for any recurring schedule that shows as "Executed" but needs to run again.

2. **Automatic Fix**: Run the provided fix script:
   ```bash
   node scripts/fix-recurring-schedules.js
   ```

3. **Permanent Fix**: Add the `fix-recurring-schedules.sh` script to your crontab to run hourly:
   ```
   0 * * * * /path/to/geo-profile-dashboard/fix-recurring-schedules.sh
   ```

This will find all recurring schedules that have been executed but not reset, and reset them to run at the next occurrence.

## Other Schedule-Related Issues

### One-Time Schedules

One-time schedules should have `last_executed_at` set after execution and remain that way, as they're not meant to run again.

### Schedule Timing Issues

If schedules aren't running at the expected times, check:
1. The server timezone vs. the timezone specified in the schedule
2. Whether the scheduler cron job is running properly
3. Logs in `logs/schedule-executor.log`
