-- Utility queries for monitoring profile schedules

-- Query 1: View all scheduled profiles with status
SELECT 
  id,
  profile_id,
  device_id,
  action_type,
  start_time,
  created_at,
  last_executed_at,
  ui_initiated,
  CASE 
    WHEN last_executed_at IS NULL AND start_time > NOW() THEN 'Pending'
    WHEN last_executed_at IS NULL AND start_time <= NOW() THEN 'Due for execution'
    WHEN last_executed_at IS NOT NULL THEN 'Executed'
    ELSE 'Unknown'
  END as status,
  EXTRACT(EPOCH FROM (start_time - created_at))/60 as scheduled_delay_minutes
FROM 
  schedules
WHERE 
  action_type IN ('push_profile', 'remove_profile')
ORDER BY 
  created_at DESC
LIMIT 50;

-- Query 2: View paired temporary profile installations
SELECT 
  s1.id as install_id,
  s2.id as remove_id,
  s1.profile_id,
  s1.device_id,
  s1.start_time as install_time,
  s1.last_executed_at as installed_at,
  s2.start_time as scheduled_removal_time,
  s2.last_executed_at as removed_at,
  
  -- Calculate the difference in minutes
  EXTRACT(EPOCH FROM (s2.start_time - s1.start_time))/60 as duration_minutes,
  
  s1.action_type as install_action,
  s2.action_type as remove_action,
  s1.ui_initiated
FROM 
  schedules s1
JOIN 
  schedules s2 ON s1.profile_id = s2.profile_id AND s1.device_id = s2.device_id AND s2.id > s1.id
WHERE 
  s1.action_type = 'push_profile' 
  AND s2.action_type = 'remove_profile'
  AND s1.start_time < s2.start_time
ORDER BY 
  s1.created_at DESC
LIMIT 20;

-- Query 3: Find scheduled deployments that failed to execute
SELECT 
  id,
  profile_id,
  device_id,
  action_type,
  start_time,
  created_at,
  enabled
FROM 
  schedules
WHERE 
  last_executed_at IS NULL
  AND start_time < NOW() - INTERVAL '15 minutes'
  AND enabled = true
  AND action_type IN ('push_profile', 'remove_profile')
ORDER BY 
  start_time ASC;

-- Query 4: View API logs for scheduled profile operations
SELECT 
  l.id,
  l.created_at,
  l.schedule_id,
  l.action_type,
  l.profile_id,
  l.device_id,
  l.request_method,
  l.success,
  s.ui_initiated
FROM 
  simplemdm_api_logs l
LEFT JOIN
  schedules s ON l.schedule_id = s.id
WHERE 
  l.action_type IN ('push_profile', 'remove_profile')
ORDER BY 
  l.created_at DESC
LIMIT 50;
