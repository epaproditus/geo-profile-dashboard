When using supabase, we use the web sql editor. 


This is how Pushing Configuration Profiles for installation works: 

The main ProfilesList component displays a list of profiles
Each profile is rendered as a ProfileCard
When the user clicks "Deploy to Device" on a profile card, it opens the DeployProfileDialog
The dialog allows selecting a device from a dropdown
Clicking "Deploy Profile" calls pushProfile.mutate() which uses the usePushProfileToDevice hook from use-simplemdm.ts
The hook in turn calls simplemdmApi.pushProfileToDevice() which makes the API call to SimpleMDM

