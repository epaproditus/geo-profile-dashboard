-- Migration: add_user_admin_function created at 2025-05-12T19:57:07.310Z
-- Add functions to manage admin users and check admin status

-- Create function to check if a user is an admin
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

-- Create a function to set a user as admin
CREATE OR REPLACE FUNCTION public.set_user_admin_status(target_user_id uuid, admin_status boolean)
RETURNS boolean AS $$
DECLARE
  current_user_id uuid;
  current_user_is_admin boolean;
BEGIN
  -- Get the current user's ID
  current_user_id := auth.uid();
  
  -- Check if the current user is an admin
  SELECT public.is_admin(current_user_id) INTO current_user_is_admin;
  
  -- Only allow admin users to set admin status
  IF current_user_is_admin THEN
    -- Update the user's metadata
    UPDATE auth.users
    SET raw_user_meta_data = 
      CASE 
        WHEN raw_user_meta_data IS NULL THEN 
          jsonb_build_object('is_admin', admin_status)
        ELSE
          jsonb_set(raw_user_meta_data, '{is_admin}', to_jsonb(admin_status))
      END
    WHERE id = target_user_id;
    
    RETURN true;
  ELSE
    RAISE EXCEPTION 'Only administrators can set admin status';
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all users with their admin status
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

-- Set first user as an admin (if no admins exist)
DO $$
DECLARE
  first_user_id uuid;
  admin_exists boolean;
BEGIN
  -- Check if any admin exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE (raw_user_meta_data->>'is_admin')::boolean = true
  ) INTO admin_exists;

  -- If no admin exists, make the first user an admin
  IF NOT admin_exists THEN
    SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
      UPDATE auth.users
      SET raw_user_meta_data = 
        CASE 
          WHEN raw_user_meta_data IS NULL THEN 
            jsonb_build_object('is_admin', true)
          ELSE
            jsonb_set(raw_user_meta_data, '{is_admin}', 'true'::jsonb)
        END
      WHERE id = first_user_id;
    END IF;
  END IF;
END $$;

