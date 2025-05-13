-- Update admin functions to handle both is_super_admin locations
-- Adds a new function to update both root-level and metadata-level admin fields

-- Add function to update both admin status fields
CREATE OR REPLACE FUNCTION public.set_super_admin_status(
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
  
  -- Check if the current user is an admin
  SELECT public.is_admin(current_user_id) INTO current_user_is_admin;
  
  -- Only allow admin users to set admin status
  IF current_user_is_admin THEN
    -- Update both the root field and the metadata field
    UPDATE auth.users
    SET 
      is_super_admin = admin_status,
      raw_user_meta_data = 
        CASE 
          WHEN raw_user_meta_data IS NULL THEN 
            jsonb_build_object('is_super_admin', admin_status)
          ELSE
            jsonb_set(raw_user_meta_data, '{is_super_admin}', to_jsonb(admin_status))
        END
    WHERE id = target_user_id;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected > 0;
  ELSE
    RAISE EXCEPTION 'Only administrators can set admin status';
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update is_admin function to check both places for is_super_admin
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
  
  -- Combine both is_super_admin values (either one being true means the user is a super admin)
  _is_super_admin := COALESCE(_meta_is_super_admin, false) OR COALESCE(_root_is_super_admin, false);
  
  -- Check all possible admin indicators (any of these being true means the user is an admin)
  RETURN COALESCE(_is_admin, false) OR 
         _is_super_admin OR 
         COALESCE(_role, '') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
