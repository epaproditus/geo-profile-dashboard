-- Add function to update the root level is_super_admin field

-- Create a function to update the root is_super_admin field
CREATE OR REPLACE FUNCTION public.update_root_super_admin(
  target_user_id uuid, 
  admin_status boolean
)
RETURNS boolean AS $$
DECLARE
  rows_affected integer;
BEGIN
  -- Update the root field directly
  UPDATE auth.users
  SET is_super_admin = admin_status
  WHERE id = target_user_id;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
