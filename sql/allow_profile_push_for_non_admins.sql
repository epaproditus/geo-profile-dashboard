-- Allow non-admin users to push profiles by modifying schedules RLS policy
-- This policy allows non-admin users to INSERT schedules with action_type = 'push_profile'
-- while preserving the restriction that only admins can update or delete schedules

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Only admins can insert schedules" ON public.schedules;

-- Create new policy for inserting schedules
-- This allows:
-- 1. Admin users to insert any schedule
-- 2. Non-admin users to only insert schedules with action_type = 'push_profile'
CREATE POLICY "Users can insert profile push schedules" 
  ON public.schedules 
  FOR INSERT 
  WITH CHECK (
    public.is_admin(auth.uid()) OR -- Admin users can insert any schedules
    (
      action_type = 'push_profile' -- Non-admin users can only insert push_profile schedules
    )
  );

-- Note that the existing policies remain in place:
-- - Everyone can view schedules
-- - Only admins can update schedules 
-- - Only admins can delete schedules
