-- Add action_type and assignment_group_id columns to the schedules table
-- These fields are needed to support SimpleMDM API actions like push_profile

-- Add action_type column to specify what SimpleMDM action to perform
ALTER TABLE public.schedules
ADD COLUMN action_type text;

COMMENT ON COLUMN public.schedules.action_type IS 'Type of SimpleMDM action to perform (update_os, push_apps, push_profile, custom_command)';

-- Add assignment_group_id column for profile assignments
ALTER TABLE public.schedules
ADD COLUMN assignment_group_id integer;

COMMENT ON COLUMN public.schedules.assignment_group_id IS 'SimpleMDM assignment group ID for push_profile actions';

-- Migrate existing schedules with profile_id to use push_profile action_type
UPDATE public.schedules
SET action_type = 'push_profile'
WHERE profile_id IS NOT NULL AND action_type IS NULL;

-- Add device_group_id column for device group operations
ALTER TABLE public.schedules
ADD COLUMN device_group_id integer;

COMMENT ON COLUMN public.schedules.device_group_id IS 'SimpleMDM device group ID for update_os, push_apps, and custom_command actions';

-- Add command_data column for custom commands
ALTER TABLE public.schedules
ADD COLUMN command_data text;

COMMENT ON COLUMN public.schedules.command_data IS 'Command data for custom_command actions';
