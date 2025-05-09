export type ScheduleType = 'one_time' | 'recurring';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly';

export interface Schedule {
  id: string;
  name: string;
  description: string | null;
  profile_id: string;
  device_filter: string | null;
  schedule_type: ScheduleType;
  start_time: string;
  end_time: string | null;
  recurrence_pattern: RecurrencePattern | null;
  days_of_week: string | null; // Changed from recurrence_days to match DB column
  day_of_month: number | null; // Added to match DB schema
  timezone: string;
  enabled: boolean;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
  // SimpleMDM integration fields
  action_type: string | null;
  assignment_group_id: number | null;
  device_group_id: number | null;
  command_data: string | null;
}

export type ScheduleCreate = Omit<Schedule, 'id' | 'created_at' | 'updated_at' | 'last_executed_at'> & {
  last_executed_at?: string | null;
};