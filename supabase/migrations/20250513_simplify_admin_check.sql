-- Simplify admin check to rely primarily on is_admin metadata field

-- Update is_admin function to prioritize is_admin field
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
  
  -- Simplify the check - prioritize is_admin field but maintain backward compatibility
  -- Primarily check the is_admin field (this is our desired field moving forward)
  RETURN COALESCE(_is_admin, false) OR
         -- These are for backward compatibility with existing data 
         COALESCE(_meta_is_super_admin, false) OR 
         COALESCE(_root_is_super_admin, false) OR
         COALESCE(_role, '') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
