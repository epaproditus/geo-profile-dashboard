-- Rename recurrence_days to days_of_week to match application code
ALTER TABLE schedules RENAME COLUMN recurrence_days TO days_of_week;

-- Add comment to explain the column
COMMENT ON COLUMN schedules.days_of_week IS 'Array of days (0-6 for weekly schedules where 0=Sunday, or 1-31 for monthly schedules)';