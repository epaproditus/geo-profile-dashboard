-- Migration: update_policies_table_admin_rls created at 2025-05-12T21:00:00Z
-- Update row-level security policies on policies table to restrict modifications to admin users only

-- First, drop the existing policies
DROP POLICY IF EXISTS "Users can only view their own policies" ON public.policies;
DROP POLICY IF EXISTS "Users can only insert their own policies" ON public.policies;
DROP POLICY IF EXISTS "Users can only update their own policies" ON public.policies;
DROP POLICY IF EXISTS "Users can only delete their own policies" ON public.policies;

-- Create new policies similar to the schedules table
-- Allow all users to view policies
CREATE POLICY "Users can view all policies" 
  ON public.policies 
  FOR SELECT 
  USING (true); -- Anyone can view policies

-- Only admins can insert policies
CREATE POLICY "Only admins can insert policies" 
  ON public.policies 
  FOR INSERT 
  WITH CHECK (public.is_admin(auth.uid())); -- Only admins can create

-- Only admins can update policies
CREATE POLICY "Only admins can update policies" 
  ON public.policies 
  FOR UPDATE 
  USING (public.is_admin(auth.uid())); -- Only admins can update

-- Only admins can delete policies
CREATE POLICY "Only admins can delete policies" 
  ON public.policies 
  FOR DELETE 
  USING (public.is_admin(auth.uid())); -- Only admins can delete

-- Make sure RLS is enabled for the policies table
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
