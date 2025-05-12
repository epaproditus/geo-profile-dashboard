-- Migration: add_single_editable_profile created at 2025-05-12T22:00:00Z
-- Create storage for a single editable custom configuration profile

-- Create a table for the single editable custom configuration profile
CREATE TABLE public.editable_profile (
  id SERIAL PRIMARY KEY,
  simplemdm_profile_id INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  profile_identifier TEXT NOT NULL,
  content JSONB NOT NULL,
  original_content JSONB NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Add RLS policies to restrict modifications to admin users
ALTER TABLE public.editable_profile ENABLE ROW LEVEL SECURITY;

-- Everyone can view the editable profile
CREATE POLICY "Users can view editable_profile" 
  ON public.editable_profile 
  FOR SELECT 
  USING (true);

-- Only admins can create/update the editable profile
CREATE POLICY "Only admins can insert editable_profile" 
  ON public.editable_profile 
  FOR INSERT 
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update editable_profile" 
  ON public.editable_profile 
  FOR UPDATE 
  USING (public.is_admin(auth.uid()));

-- Add function to initialize the editable profile with values from SimpleMDM
CREATE OR REPLACE FUNCTION public.initialize_editable_profile(
  p_simplemdm_profile_id INTEGER,
  p_name TEXT,
  p_profile_identifier TEXT,
  p_content JSONB
) RETURNS INTEGER AS $$
DECLARE
  v_profile_id INTEGER;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is admin
  IF NOT public.is_admin(v_user_id) THEN
    RAISE EXCEPTION 'Only administrators can initialize the editable profile';
  END IF;
  
  -- Delete any existing profile (this is a single profile system)
  DELETE FROM public.editable_profile;
  
  -- Insert the new editable profile
  INSERT INTO public.editable_profile
    (simplemdm_profile_id, name, profile_identifier, content, original_content, last_updated_by)
  VALUES
    (p_simplemdm_profile_id, p_name, p_profile_identifier, p_content, p_content, v_user_id)
  RETURNING id INTO v_profile_id;
  
  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to update the editable profile content
CREATE OR REPLACE FUNCTION public.update_editable_profile(
  p_content JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is admin
  IF NOT public.is_admin(v_user_id) THEN
    RAISE EXCEPTION 'Only administrators can update the editable profile';
  END IF;
  
  -- Update the profile
  UPDATE public.editable_profile
  SET content = p_content,
      last_updated_at = NOW(),
      last_updated_by = v_user_id;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a SimpleMDM profile ID is the editable one
CREATE OR REPLACE FUNCTION public.is_editable_profile(
  p_simplemdm_profile_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.editable_profile 
    WHERE simplemdm_profile_id = p_simplemdm_profile_id
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
