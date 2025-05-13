# Quick Profile Scheduler

The Quick Profile Scheduler feature enables standard users to temporarily install specific profiles on devices for a limited duration. This document explains how to set up and use this feature.

## Features

- Allow standard users to push specific profiles (173535, 173628) to devices
- Schedule automatic removal of profiles after a specified duration
- View active and completed assignments
- Cancel ongoing profile installations

## Setup Requirements

1. The Supabase database tables and functions (created via migration: `20250513200000_add_quick_profile_scheduler.sql`)
2. The API endpoint (`/api/quick-profiles.js`)
3. The React component (`QuickProfileScheduler.tsx`) or page (`QuickProfiles.tsx`)
4. The profile removal script (`scripts/process-quick-profile-removals.js`)
5. A cron job to run the profile removal script periodically

## Cron Setup

Add the following line to your server's crontab to run the profile removal process every 5 minutes:

```bash
# Run the quick profile removal process every 5 minutes
*/5 * * * * /path/to/geo-profile-dashboard/run-quick-profile-removals.sh
```

You can use the example crontab file as a reference:

```bash
sudo cp crontab.example /etc/cron.d/geo-profile-dashboard
sudo chmod 644 /etc/cron.d/geo-profile-dashboard
```

## How It Works

1. **User selects a profile**: Users can select from two approved profiles (ID: 173535 or 173628)
2. **User selects a device**: Users choose which device to install the profile on
3. **User sets duration**: Users specify how long the profile should remain installed (in minutes)
4. **System schedules installation**: The profile is pushed to the device and scheduled for removal
5. **Automatic removal**: The scheduler will automatically remove the profile after the specified duration

## Database Structure

The `quick_profile_assignments` table stores all profile assignments with the following fields:

- `id`: Unique identifier for the assignment
- `user_id`: The user who created the assignment
- `profile_id`: The profile to install
- `device_id`: The device to install on
- `install_at`: When to install the profile
- `remove_at`: When to remove the profile
- `status`: Current status (scheduled, installed, removed, failed)
- `created_at`, `updated_at`: Timestamps

## API Endpoints

- `GET /api/quick-profiles`: Get a list of the user's quick profile assignments
- `POST /api/quick-profiles`: Create a new quick profile assignment
- `DELETE /api/quick-profiles?assignmentId=X`: Cancel an existing assignment

## User Interface

The Quick Profile Scheduler is accessible via the `/quick-profiles` route, which is linked in the navigation bar. Users can:

1. Create new profile assignments
2. View active assignments
3. View assignment history
4. Cancel active assignments

## Troubleshooting

If profiles are not being removed automatically:

1. Check that the cron job is properly configured
2. Verify that the `run-quick-profile-removals.sh` script has execute permissions
3. Check the scheduler log for errors: `tail -f scheduler.log`
4. Ensure the SimpleMDM API key is correctly set in the environment variables
