// Script to update admin functions manually
console.log(`
IMPORTANT: You need to run the following SQL in the Supabase SQL Editor:

-- Update function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
DECLARE
  _is_admin boolean;
  _is_super_admin boolean;
  _role text;
BEGIN
  -- Query the user's metadata from auth.users
  SELECT 
    (raw_user_meta_data->>'is_admin')::boolean,
    (raw_user_meta_data->>'is_super_admin')::boolean,
    (raw_user_meta_data->>'role')
  INTO 
    _is_admin, _is_super_admin, _role
  FROM auth.users
  WHERE id = user_id;
  
  -- Check all possible admin indicators
  RETURN COALESCE(_is_admin, false) OR 
         COALESCE(_is_super_admin, false) OR 
         COALESCE(_role, '') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function to get all users with their admin status
CREATE OR REPLACE FUNCTION public.get_users_with_admin_status()
RETURNS TABLE (
  id uuid,
  email text,
  is_admin boolean,
  created_at timestamptz
) AS $$
DECLARE
  current_user_id uuid;
  current_user_is_admin boolean;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();
  
  -- Check if the current user is an admin
  SELECT public.is_admin(current_user_id) INTO current_user_is_admin;
  
  -- Only allow admin users to view all users
  IF current_user_is_admin THEN
    RETURN QUERY
    SELECT
      u.id,
      COALESCE(u.email, u.phone, '(no email)') as email,
      COALESCE(
        (u.raw_user_meta_data->>'is_admin')::boolean, 
        (u.raw_user_meta_data->>'is_super_admin')::boolean, 
        u.raw_user_meta_data->>'role' = 'admin', 
        false
      ) as is_admin,
      u.created_at
    FROM auth.users u
    ORDER BY u.created_at DESC;
  ELSE
    -- Non-admins can only see themselves
    RETURN QUERY
    SELECT
      u.id,
      COALESCE(u.email, u.phone, '(no email)') as email,
      COALESCE(
        (u.raw_user_meta_data->>'is_admin')::boolean, 
        (u.raw_user_meta_data->>'is_super_admin')::boolean, 
        u.raw_user_meta_data->>'role' = 'admin', 
        false
      ) as is_admin,
      u.created_at
    FROM auth.users u
    WHERE u.id = current_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`);
