-- Create schedules table
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  profile_id TEXT NOT NULL, -- SimpleMDM profile ID
  device_filter TEXT, -- Device query or filter (optional)
  schedule_type TEXT NOT NULL, -- 'one_time', 'recurring', etc.
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ, -- Optional end time for recurring schedules
  recurrence_pattern TEXT, -- For recurring schedules (daily, weekly, monthly)
  recurrence_days INTEGER[], -- Days of week (for weekly) or days of month
  timezone TEXT NOT NULL DEFAULT 'UTC',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a function to update the updated_at field
CREATE OR REPLACE FUNCTION update_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function
CREATE TRIGGER update_schedules_updated_at
BEFORE UPDATE ON schedules
FOR EACH ROW
EXECUTE FUNCTION update_schedules_updated_at();

-- Create index on start_time for efficient querying
CREATE INDEX idx_schedules_start_time ON schedules(start_time);

-- Create index on enabled status
CREATE INDEX idx_schedules_enabled ON schedules(enabled);