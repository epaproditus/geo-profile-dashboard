-- Fix get_users_with_admin_status to use consistent admin status display

-- Update the function to ensure consistency between display and actual admin state
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
      -- Use is_admin function directly to match the same check used for authorization
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
