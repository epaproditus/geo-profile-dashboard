-- Migration: add_admin_row_level_security created at 2025-05-12T20:06:37.763Z
-- Add row-level security policies to restrict modifications to admin users

-- First, make sure the is_admin function is available
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
DECLARE
  _is_admin boolean;
BEGIN
  -- Query the user's metadata from auth.users
  SELECT (raw_user_meta_data->>'is_admin')::boolean INTO _is_admin
  FROM auth.users
  WHERE id = user_id;
  
  -- Return false if the user has no admin flag set
  RETURN COALESCE(_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for schedules table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all schedules" ON public.schedules;
DROP POLICY IF EXISTS "Only admins can insert schedules" ON public.schedules;
DROP POLICY IF EXISTS "Only admins can update schedules" ON public.schedules;
DROP POLICY IF EXISTS "Only admins can delete schedules" ON public.schedules;

-- Create new policies
CREATE POLICY "Users can view all schedules" 
  ON public.schedules 
  FOR SELECT 
  USING (true); -- Anyone can view schedules

CREATE POLICY "Only admins can insert schedules" 
  ON public.schedules 
  FOR INSERT 
  WITH CHECK (public.is_admin(auth.uid())); -- Only admins can create

CREATE POLICY "Only admins can update schedules" 
  ON public.schedules 
  FOR UPDATE 
  USING (public.is_admin(auth.uid())); -- Only admins can update

CREATE POLICY "Only admins can delete schedules" 
  ON public.schedules 
  FOR DELETE 
  USING (public.is_admin(auth.uid())); -- Only admins can delete

-- Make sure RLS is enabled for the schedules table
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for profiles table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Only admins can update profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.profiles;
    
    -- Create new policies
    CREATE POLICY "Users can view all profiles" 
      ON public.profiles 
      FOR SELECT 
      USING (true); -- Anyone can view profiles
    
    CREATE POLICY "Only admins can insert profiles" 
      ON public.profiles 
      FOR INSERT 
      WITH CHECK (public.is_admin(auth.uid())); -- Only admins can create
    
    CREATE POLICY "Only admins can update profiles" 
      ON public.profiles 
      FOR UPDATE 
      USING (public.is_admin(auth.uid())); -- Only admins can update
    
    CREATE POLICY "Only admins can delete profiles" 
      ON public.profiles 
      FOR DELETE 
      USING (public.is_admin(auth.uid())); -- Only admins can delete
    
    -- Make sure RLS is enabled for the profiles table
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

