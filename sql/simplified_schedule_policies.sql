-- First, let's check the actual structure of the schedules table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'schedules';

-- Then, create policies using only columns that definitely exist

-- Create a policy to allow basic insert for authenticated users
CREATE POLICY schedules_insert
  ON public.schedules 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    -- Only allow pushes for profile installation/removal
    (action_type = 'push_profile' OR action_type = 'remove_profile') 
    OR public.is_admin(auth.uid())
  );

-- Only allow admins to UPDATE schedules
CREATE POLICY schedules_update
  ON public.schedules 
  FOR UPDATE 
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Only allow admins to DELETE schedules
CREATE POLICY schedules_delete
  ON public.schedules 
  FOR DELETE 
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Everyone can SELECT schedules for display purposes
CREATE POLICY schedules_select
  ON public.schedules 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Make sure RLS is enabled on the schedules table
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
