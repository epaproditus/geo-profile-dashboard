When using supabase, we use the web sql editor. 


This is how Pushing Configuration Profiles for installation works: 

The main ProfilesList component displays a list of profiles
Each profile is rendered as a ProfileCard
When the user clicks "Deploy to Device" on a profile card, it opens the DeployProfileDialog
The dialog allows selecting a device from a dropdown
Clicking "Deploy Profile" calls pushProfile.mutate() which uses the usePushProfileToDevice hook from use-simplemdm.ts
The hook in turn calls simplemdmApi.pushProfileToDevice() which makes the API call to SimpleMDM

Understanding Temporary Profile Installation
Based on your codebase and how configuration profiles are deployed, you're correct about how the temporary profile installation system works:

How Your Temporary Profile Installation Works
For temporary profile installations, your system uses a two-phase approach:

Immediate Installation:

When you use "Deploy to Device" in the UI, it calls the SimpleMDM API directly through the frontend
This bypasses the executor.js entirely
The profile is installed immediately on the device
Scheduled Removal:

Simultaneously, a schedule is created in the database for the future removal
This has action_type = 'remove_profile', start_time = now + duration, and last_executed_at = null
This record will be picked up by executor.js at the appropriate time
