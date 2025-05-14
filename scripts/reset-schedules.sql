-- Reset the recurring schedules that weren't properly reset after execution
-- Run this SQL in the Supabase SQL Editor

-- BYE Schedule (Profile Removal)
UPDATE schedules
SET 
  start_time = (current_date + interval '1 day' + 
    (extract(hour from start_time)::int * interval '1 hour') + 
    (extract(minute from start_time)::int * interval '1 minute') + 
    (extract(second from start_time)::int * interval '1 second')),
  last_executed_at = NULL
WHERE id = '3cddcb90-8fbf-4355-9895-0dea7032f6c0';

-- HI Schedule (Profile Installation)
UPDATE schedules
SET 
  start_time = (current_date + interval '1 day' + 
    (extract(hour from start_time)::int * interval '1 hour') + 
    (extract(minute from start_time)::int * interval '1 minute') + 
    (extract(second from start_time)::int * interval '1 second')),
  last_executed_at = NULL
WHERE id = '3f4d0b72-39d7-406e-a411-59de832f13e6';

-- Verify the changes
SELECT 
  id, 
  name, 
  start_time, 
  last_executed_at, 
  schedule_type, 
  recurrence_pattern
FROM schedules
WHERE id IN (
  '3cddcb90-8fbf-4355-9895-0dea7032f6c0',
  '3f4d0b72-39d7-406e-a411-59de832f13e6'
);
