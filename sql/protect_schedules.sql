-- Ensure schedules are still protected from non-admin modification
-- Run this in the Supabase web SQL editor

-- First, let's verify existing RLS policies on schedules
SELECT tablename, policyname, permissive, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'schedules';

-- If needed, create or update policies to ensure only admins can modify schedules
-- except when created through the UI profile push flow

-- Create or replace a policy to allow both admin and non-admin users to INSERT schedules,
-- but only when they come from UI-initiated profile pushes
-- (this is what happens when using the "Deploy to Device" button)
CREATE OR REPLACE POLICY "Allow UI-initiated schedules" 
  ON public.schedules 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    (ui_initiated = true AND (action_type = 'push_profile' OR action_type = 'remove_profile')) 
    OR public.is_admin(auth.uid())
  );

-- Only allow admins to UPDATE schedules
CREATE OR REPLACE POLICY "Only admins can update schedules" 
  ON public.schedules 
  FOR UPDATE 
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Only allow admins to DELETE schedules
CREATE OR REPLACE POLICY "Only admins can delete schedules" 
  ON public.schedules 
  FOR DELETE 
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Everyone can SELECT schedules for display purposes
CREATE OR REPLACE POLICY "Allow users to view schedules" 
  ON public.schedules 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Make sure RLS is enabled on the schedules table
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- This ensures that non-admin users can:
-- 1. Push profiles via the UI (creating push and removal schedules)
-- 2. View schedules (to see status of their profile pushes)
-- But cannot:
-- 1. Modify existing schedules
-- 2. Delete schedules
-- 3. Create arbitrary schedules outside the profile push flow
