-- Add day_of_month column to schedules table
ALTER TABLE schedules ADD COLUMN day_of_month INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN schedules.day_of_month IS 'Specific day of month for monthly schedules (1-31)';