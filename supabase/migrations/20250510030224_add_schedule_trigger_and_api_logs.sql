-- Migration: add_schedule_trigger_and_api_logs

-- Create API logs table to track SimpleMDM API calls
CREATE TABLE IF NOT EXISTS public.simplemdm_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.schedules(id),
  action_type TEXT NOT NULL,
  profile_id INTEGER,
  device_id TEXT,
  device_group_id INTEGER,
  assignment_group_id INTEGER,
  request_url TEXT NOT NULL,
  request_method TEXT NOT NULL,
  request_payload JSONB,
  response_status INTEGER,
  response_body JSONB,
  success BOOLEAN NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT
);

-- Create index for faster queries on schedule_id
CREATE INDEX IF NOT EXISTS idx_simplemdm_api_logs_schedule_id ON public.simplemdm_api_logs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_simplemdm_api_logs_executed_at ON public.simplemdm_api_logs(executed_at);

-- Create a trigger function to automatically set action_type for schedules with profile_id
CREATE OR REPLACE FUNCTION set_schedule_action_type()
RETURNS TRIGGER AS $$
BEGIN
  -- If profile_id is set but action_type isn't, set to 'push_profile'
  IF NEW.profile_id IS NOT NULL AND NEW.action_type IS NULL THEN
    NEW.action_type := 'push_profile';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on schedules table
DROP TRIGGER IF EXISTS before_schedule_insert_update ON public.schedules;
CREATE TRIGGER before_schedule_insert_update
BEFORE INSERT OR UPDATE ON public.schedules
FOR EACH ROW EXECUTE FUNCTION set_schedule_action_type();

-- Add helpful comments
COMMENT ON TABLE public.simplemdm_api_logs IS 'Logs of API calls made to the SimpleMDM API';
COMMENT ON COLUMN public.simplemdm_api_logs.schedule_id IS 'Reference to the schedule that triggered this API call';
COMMENT ON COLUMN public.simplemdm_api_logs.action_type IS 'Type of SimpleMDM action performed (push_profile, update_os, etc.)';
COMMENT ON COLUMN public.simplemdm_api_logs.success IS 'Whether the API call was successful';