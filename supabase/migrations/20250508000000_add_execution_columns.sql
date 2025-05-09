-- Add missing execution status and result columns to schedules table
ALTER TABLE schedules
ADD COLUMN IF NOT EXISTS last_execution_status TEXT,
ADD COLUMN IF NOT EXISTS last_execution_result JSONB;

-- Create index on last_execution_status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_schedules_last_execution_status ON schedules(last_execution_status);
