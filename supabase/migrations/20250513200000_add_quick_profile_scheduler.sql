-- Add quick profile scheduler tables and functions
-- Migration created: 2025-05-13

-- Create table for temporary profile assignments
CREATE TABLE public.quick_profile_assignments (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  profile_id INTEGER NOT NULL,
  device_id INTEGER NOT NULL,
  install_at TIMESTAMP WITH TIME ZONE NOT NULL,
  remove_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'installed', 'removed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster queries
CREATE INDEX idx_quick_profile_assignments_status ON public.quick_profile_assignments(status);
CREATE INDEX idx_quick_profile_assignments_user_id ON public.quick_profile_assignments(user_id);
CREATE INDEX idx_quick_profile_assignments_install_at ON public.quick_profile_assignments(install_at);
CREATE INDEX idx_quick_profile_assignments_remove_at ON public.quick_profile_assignments(remove_at);

-- Add RLS policies
ALTER TABLE public.quick_profile_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for selecting - users can see only their own assignments
CREATE POLICY "Users can view their own assignments" 
  ON public.quick_profile_assignments
  FOR SELECT 
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Policy for inserting - users can insert their own assignments
CREATE POLICY "Users can create their own assignments" 
  ON public.quick_profile_assignments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND profile_id IN (173535, 173628));

-- Policy for updating - users can update only their own assignments
CREATE POLICY "Users can update their own assignments" 
  ON public.quick_profile_assignments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND profile_id IN (173535, 173628));

-- Policy for deleting - users can delete only their own assignments
CREATE POLICY "Users can delete their own assignments" 
  ON public.quick_profile_assignments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get quick profile assignments for a user
CREATE OR REPLACE FUNCTION public.get_quick_profile_assignments(
  _limit INTEGER DEFAULT 100,
  _offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id INTEGER,
  profile_id INTEGER,
  device_id INTEGER,
  install_at TIMESTAMP WITH TIME ZONE,
  remove_at TIMESTAMP WITH TIME ZONE,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  current_user_id UUID;
  current_user_is_admin BOOLEAN;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if the current user is an admin
  SELECT public.is_admin(current_user_id) INTO current_user_is_admin;
  
  -- Return rows based on user permissions
  RETURN QUERY
  SELECT 
    qpa.id,
    qpa.profile_id,
    qpa.device_id,
    qpa.install_at,
    qpa.remove_at,
    qpa.status,
    qpa.created_at,
    qpa.updated_at
  FROM public.quick_profile_assignments qpa
  WHERE 
    qpa.user_id = current_user_id OR current_user_is_admin
  ORDER BY qpa.created_at DESC
  LIMIT _limit
  OFFSET _offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new quick profile assignment
CREATE OR REPLACE FUNCTION public.create_quick_profile_assignment(
  _profile_id INTEGER,
  _device_id INTEGER,
  _duration_minutes INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  current_user_id UUID;
  install_time TIMESTAMP WITH TIME ZONE;
  remove_time TIMESTAMP WITH TIME ZONE;
  new_assignment_id INTEGER;
BEGIN
  -- Validate profile ID is allowed for standard users
  IF _profile_id NOT IN (173535, 173628) THEN
    RAISE EXCEPTION 'Invalid profile ID. Only specific profiles are allowed for quick scheduling.';
  END IF;
  
  -- Set timestamps
  current_user_id := auth.uid();
  install_time := NOW();
  remove_time := install_time + (_duration_minutes * INTERVAL '1 minute');
  
  -- Insert new assignment
  INSERT INTO public.quick_profile_assignments(
    user_id,
    profile_id,
    device_id,
    install_at,
    remove_at,
    status
  ) VALUES (
    current_user_id,
    _profile_id,
    _device_id,
    install_time,
    remove_time,
    'scheduled'
  ) RETURNING id INTO new_assignment_id;
  
  RETURN new_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel a quick profile assignment
CREATE OR REPLACE FUNCTION public.cancel_quick_profile_assignment(
  _assignment_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
  current_user_id UUID;
  current_user_is_admin BOOLEAN;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if the current user is an admin
  SELECT public.is_admin(current_user_id) INTO current_user_is_admin;
  
  -- Update assignment status to 'removed'
  IF current_user_is_admin THEN
    -- Admins can cancel any assignment
    UPDATE public.quick_profile_assignments
    SET 
      status = 'removed',
      updated_at = NOW()
    WHERE 
      id = _assignment_id;
  ELSE
    -- Standard users can only cancel their own assignments
    UPDATE public.quick_profile_assignments
    SET 
      status = 'removed',
      updated_at = NOW()
    WHERE 
      id = _assignment_id AND
      user_id = current_user_id;
  END IF;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
