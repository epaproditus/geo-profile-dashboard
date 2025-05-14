-- Migration: non_admin_installable_profiles
-- Create a table to track which profiles can be installed by non-admin users

-- Create the non_admin_installable_profiles table
CREATE TABLE IF NOT EXISTS public.non_admin_installable_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (profile_id)
);

-- Add comment to the table
COMMENT ON TABLE public.non_admin_installable_profiles IS 'Tracks which SimpleMDM profiles can be installed by non-admin users';

-- Create RLS policies for the non_admin_installable_profiles table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all non_admin_installable_profiles" ON public.non_admin_installable_profiles;
DROP POLICY IF EXISTS "Only admins can insert non_admin_installable_profiles" ON public.non_admin_installable_profiles;
DROP POLICY IF EXISTS "Only admins can update non_admin_installable_profiles" ON public.non_admin_installable_profiles;
DROP POLICY IF EXISTS "Only admins can delete non_admin_installable_profiles" ON public.non_admin_installable_profiles;

-- Create new policies
CREATE POLICY "Users can view all non_admin_installable_profiles" 
  ON public.non_admin_installable_profiles 
  FOR SELECT 
  USING (true); -- Anyone can view which profiles are installable by non-admins

CREATE POLICY "Only admins can insert non_admin_installable_profiles" 
  ON public.non_admin_installable_profiles 
  FOR INSERT 
  WITH CHECK (public.is_admin(auth.uid())); -- Only admins can designate installable profiles

CREATE POLICY "Only admins can update non_admin_installable_profiles" 
  ON public.non_admin_installable_profiles 
  FOR UPDATE 
  USING (public.is_admin(auth.uid())); -- Only admins can update installable profiles

CREATE POLICY "Only admins can delete non_admin_installable_profiles" 
  ON public.non_admin_installable_profiles 
  FOR DELETE 
  USING (public.is_admin(auth.uid())); -- Only admins can remove installable profiles

-- Make sure RLS is enabled for the non_admin_installable_profiles table
ALTER TABLE public.non_admin_installable_profiles ENABLE ROW LEVEL SECURITY;

-- Create a function to check if a profile is installable by non-admins
CREATE OR REPLACE FUNCTION public.is_profile_non_admin_installable(profile_id_param BIGINT)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.non_admin_installable_profiles 
    WHERE profile_id = profile_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_non_admin_installable_profiles_updated_at
BEFORE UPDATE ON public.non_admin_installable_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp_column();
