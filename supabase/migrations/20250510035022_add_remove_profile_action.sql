-- Migration: add_remove_profile_action
-- Add support for profile removal action to schedules

-- Add the 'remove_profile' option to action_type documentation
COMMENT ON COLUMN public.schedules.action_type IS 'Type of SimpleMDM action to perform (update_os, push_apps, push_profile, remove_profile, custom_command)';

-- Add a comment for clarification on how remove_profile works
COMMENT ON TABLE public.schedules IS 'Schedules for automated SimpleMDM actions including profile pushes and removals';

-- Set the correct action_type for existing schedules
-- This is just a safety measure to update documentation
-- No actual data changes needed
