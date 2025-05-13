-- Migration: add_temporary_profile_assignments created at 2025-05-13T16:10:45.563Z
-- Write your SQL migration here

-- Create temporary_profile_assignments table
CREATE TABLE temporary_profile_assignments (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  profile_id INTEGER NOT NULL,
  device_id INTEGER NOT NULL,
  install_at TIMESTAMP WITH TIME ZONE NOT NULL,
  remove_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'installing', 'installed', 'removing', 'removed', 'failed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create RLS policies for temporary_profile_assignments
ALTER TABLE temporary_profile_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own assignments
CREATE POLICY "Users can view their own temporary profile assignments"
  ON temporary_profile_assignments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own assignments
CREATE POLICY "Users can create their own temporary profile assignments"
  ON temporary_profile_assignments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own assignments
CREATE POLICY "Users can update their own temporary profile assignments"
  ON temporary_profile_assignments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own assignments
CREATE POLICY "Users can delete their own temporary profile assignments"
  ON temporary_profile_assignments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage all temporary profile assignments"
  ON temporary_profile_assignments
  USING (
    public.is_admin(auth.uid())
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_temporary_profile_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_temporary_profile_assignments_timestamp
BEFORE UPDATE ON temporary_profile_assignments
FOR EACH ROW
EXECUTE FUNCTION update_temporary_profile_assignments_updated_at();

-- Create view for upcoming profile assignments
CREATE VIEW upcoming_temporary_profile_assignments AS
SELECT 
  temporary_profile_assignments.*,
  auth.users.email as user_email
FROM 
  temporary_profile_assignments
JOIN 
  auth.users ON temporary_profile_assignments.user_id = auth.users.id
WHERE 
  status IN ('scheduled', 'installing')
  AND install_at > NOW() - INTERVAL '10 minutes'
ORDER BY 
  install_at ASC;

-- Create view for pending removals
CREATE VIEW pending_temporary_profile_removals AS
SELECT 
  temporary_profile_assignments.*,
  auth.users.email as user_email
FROM 
  temporary_profile_assignments
JOIN 
  auth.users ON temporary_profile_assignments.user_id = auth.users.id
WHERE 
  status = 'installed'
  AND remove_at <= NOW()
ORDER BY 
  remove_at ASC;

