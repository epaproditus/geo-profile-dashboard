-- Add function to update the root level is_super_admin field

-- Create a function to update the root is_super_admin field
CREATE OR REPLACE FUNCTION public.update_root_super_admin(
  target_user_id uuid, 
  admin_status boolean
)
RETURNS boolean AS $$
DECLARE
  current_user_id uuid;
  current_user_is_admin boolean;
  rows_affected integer;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();
  
  -- Check if the current user is an admin - use the most restrictive definition
  SELECT (raw_user_meta_data->>'is_admin')::boolean INTO current_user_is_admin
  FROM auth.users
  WHERE id = current_user_id;
  
  -- When called with service role, current_user_id will be null
  IF current_user_id IS NULL THEN
    -- This is triggered by the service role, proceed without restriction
    UPDATE auth.users
    SET is_super_admin = admin_status
    WHERE id = target_user_id;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
  ELSIF current_user_is_admin THEN
    -- This is an admin user, allow the update
    UPDATE auth.users
    SET is_super_admin = admin_status
    WHERE id = target_user_id;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
  ELSE
    -- Not admin, not service role - deny access
    RAISE EXCEPTION 'Only administrators can update admin fields';
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
