# Admin API Troubleshooting Guide

This guide will help you resolve common issues with the admin user management system.

## Environment Setup Issues

### 1. Missing Environment Variables

The admin API requires the following environment variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Solution:**
- Make sure these are in your `.env` file
- Run the application with the debug script: `./run-with-debug.sh`

### 2. Environment Variable Not Available to Server

Sometimes environment variables loaded with Vite for the frontend aren't available to the Express server.

**Solution:**
- Ensure you have both `VITE_SUPABASE_URL` and `SUPABASE_URL` in your `.env` file
- Make sure the `.env` file is in the root directory of your project
- Use the `run-with-debug.sh` script which properly exports all variables

## API Endpoint Issues

### 1. 404 Not Found for Admin API

If you're getting a 404 error when trying to update admin status:

**Solution:**
- Ensure the Express server is running and all routes are registered
- Check that the URL in `admin.ts` is correct (`${window.location.origin}/api/auth/set-admin-status`)
- Try running the `fix-simplemdm-routes.sh` script to fix related routing issues

### 2. 500 Internal Server Error

If you're seeing 500 errors:

**Solution:**
- Check the server logs for database function errors
- Make sure the Supabase service role key has the right permissions
- Verify that all SQL migrations have been applied correctly

## Database Function Issues

If the database functions aren't working as expected:

**Solution:**
- Run the `scripts/fix-admin-fields-direct.js` to repair inconsistent admin fields
- Run the `scripts/sync-admin-fields.js` to synchronize all admin fields
- Check the Supabase SQL editor to ensure functions are correctly defined

## Test Admin API Directly

You can test the admin API directly with curl:

```bash
curl -X POST http://localhost:8080/api/auth/set-admin-status \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID_HERE","isAdmin":true}'
```

## Verify Database State

To check if user records have correct admin fields:

1. Open the Supabase dashboard
2. Go to Authentication > Users
3. Check both the `raw_user_meta_data` JSON field and the root level `is_super_admin` field

## Complete Reset (Last Resort)

If everything else fails:

1. Run the SQL migrations again: 
   ```sql
   -- Fix is_admin function
   CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
   RETURNS BOOLEAN AS $$
   DECLARE
     is_admin_result BOOLEAN;
   BEGIN
     SELECT 
       COALESCE(
         auth.users.raw_user_meta_data->>'is_admin' = 'true', 
         auth.users.raw_user_meta_data->>'is_super_admin' = 'true',
         auth.users.raw_user_meta_data->>'role' = 'admin',
         auth.users.is_super_admin,
         FALSE
       ) INTO is_admin_result
     FROM auth.users
     WHERE auth.users.id = user_id;
     
     RETURN is_admin_result;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   -- Add root super_admin update function
   CREATE OR REPLACE FUNCTION public.update_root_super_admin(target_user_id UUID, admin_status BOOLEAN)
   RETURNS VOID AS $$
   BEGIN
     UPDATE auth.users
     SET is_super_admin = admin_status
     WHERE id = target_user_id;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

2. Run the fix script directly on your server:
   ```bash
   node scripts/fix-admin-fields-direct.js
   ```
