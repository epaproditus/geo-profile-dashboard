# Geo-Profile Dashboard - Precise Schedule Execution

This document describes how to set up the scheduler for precise minute-level execution of profile installations.

## Overview

The scheduler has been updated to:
1. Run every minute via cron job
2. Search for schedules due in the current minute (+/- 30 seconds)
3. Execute schedules exactly at their scheduled time

## Implementation Details

The changes ensure that profiles are installed precisely at their scheduled time by:

- Narrowing the time window from 15 minutes to just 1 minute (±30 seconds)
- Running the scheduler every minute instead of every 15 minutes

## Setup Instructions

1. Update your crontab to run the scheduler every minute:

```bash
# Run the scheduler every 1 minute for precise execution
* * * * * /path/to/geo-profile-dashboard/run-scheduler.sh
```

2. Apply the updated scheduler code (already implemented in this update)

## Testing Recommendation

To verify the system is working correctly:

1. Create a schedule for a specific time (e.g., 2:15 PM)
2. Monitor your scheduler logs around that time
3. Verify that the profile is installed within 30 seconds of the scheduled time

## Technical Implementation

The scheduler now uses a narrow 1-minute time window when looking for schedules to execute:

```javascript
// Create precise time windows for exact minute execution
const startWindow = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
const endWindow = new Date(now.getTime() + 30 * 1000);   // 30 seconds in the future
```

This ensures that schedules are only executed when their scheduled time matches the current minute.
