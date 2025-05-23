# Quick Profile Scheduler

The Quick Profile Scheduler is a feature that allows standard (non-admin) users to temporarily assign specific profiles to devices.

## Overview

This feature enables users to:

1. Select from a pre-defined list of allowed profiles
2. Push these profiles to selected devices
3. Automatically remove the profiles after a specified duration
4. Track the status of active profile assignments

## Architecture

The Quick Profile Scheduler consists of several components:

1. **Frontend**: React UI for scheduling profiles (`/src/pages/QuickProfiles.tsx`)
2. **API**: REST endpoint for managing quick profile assignments (`/api/quick-profiles.js`)
3. **Database**: Supabase table for storing assignments (`quick_profile_assignments`)
4. **Processor**: Background job to handle profile removals (`/scripts/process-quick-profile-removals.js`)

## Setup Requirements

1. Create the `quick_profile_assignments` table in Supabase (see migration file)
2. Configure the profile removal cron job
3. Update the allowed profile IDs in the configuration

## Configuration

### Allowed Profiles

By default, only specific profiles are allowed to be pushed by standard users. These are configured in the `QuickProfiles.tsx` file:

```tsx
// Fixed profile IDs that standard users are allowed to push
const ALLOWED_PROFILE_IDs = ["173535", "173628"];
```

Update this array with the IDs of profiles you want to make available.

### Automated Removals

Schedule the profile removal script to run at regular intervals (e.g., every 5 minutes):

```bash
*/5 * * * * cd /path/to/app && ./run-quick-profile-removals.sh
```

This ensures profiles are automatically removed after their specified duration.

## Usage

1. Navigate to the Quick Profiles page
2. Select a profile from the dropdown menu
3. Choose a device to receive the profile
4. Set the duration (in minutes) for the profile to remain installed
5. Click "Schedule Installation"

The profile will be installed immediately and automatically removed after the specified duration.

## Troubleshooting

If profiles are not being removed automatically:

1. Check the `quick-profile-removals.log` file for errors
2. Verify the cron job is running properly
3. Ensure the database connection is working
4. Check the status of profile assignments in the Supabase table

## Security Considerations

- Row-Level Security policies ensure users can only view and manage their own profile assignments
- Only pre-approved profiles can be installed by standard users
- Automatic removal ensures temporary profiles don't remain installed indefinitely
