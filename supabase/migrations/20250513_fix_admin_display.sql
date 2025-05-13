-- Fix both admin functions to be consistent

-- Update is_admin function to include both new and legacy checks
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
DECLARE
  _is_admin boolean;
  _is_super_admin boolean;
  _meta_is_super_admin boolean;
  _role text;
  _root_is_super_admin boolean;
BEGIN
  -- Query the user's metadata and root fields from auth.users
  SELECT 
    (raw_user_meta_data->>'is_admin')::boolean,
    (raw_user_meta_data->>'is_super_admin')::boolean,
    (raw_user_meta_data->>'role'),
    is_super_admin
  INTO 
    _is_admin, _meta_is_super_admin, _role, _root_is_super_admin
  FROM auth.users
  WHERE id = user_id;
  
  -- During transition period, we need to check all possible admin indicators
  -- This ensures backward compatibility with existing data
  RETURN COALESCE(_is_admin, false) OR 
         COALESCE(_meta_is_super_admin, false) OR 
         COALESCE(_root_is_super_admin, false) OR
         COALESCE(_role, '') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_users_with_admin_status function to be consistent with front-end
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
      -- Show admin status
      public.is_admin(u.id) as is_admin,
      u.created_at
    FROM auth.users u
    ORDER BY u.created_at DESC;
  ELSE
    -- Non-admins can only see themselves
    RETURN QUERY
    SELECT
      u.id,
      COALESCE(u.email, u.phone, '(no email)') as email,
      public.is_admin(u.id) as is_admin,
      u.created_at
    FROM auth.users u
    WHERE u.id = current_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
