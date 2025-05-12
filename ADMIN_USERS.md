# Admin User Management

This document describes how to manage admin users in the Geo Profile Dashboard.

## Overview

The dashboard supports two types of users:
1. **Standard Users** - Can view content but cannot make edits
2. **Admin Users** - Have full access to create, edit, and delete content

## Admin Features

Administrators have the following capabilities that standard users do not:
- Creating new schedules 
- Editing existing schedules
- Deleting schedules
- Changing schedule status (enable/disable)
- Creating, editing, and deleting policies
- Managing other users (via the Admin page)

## Setting Up Admin Users

### In the SQL Editor (Supabase Dashboard)

The easiest way to make a user an admin is by running the following SQL in the Supabase SQL Editor:

```sql
-- Set a user as an admin (replace YOUR_USER_ID with the actual user ID)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'::jsonb
)
WHERE id = 'YOUR_USER_ID';

-- To view all users and their admin status
SELECT 
  id, 
  email,
  raw_user_meta_data->>'is_admin' as is_admin,
  created_at
FROM auth.users;
```

### Using the Admin API

You can also use the provided API endpoint to set admin status:

```bash
curl -X POST https://your-site.com/api/auth/set-admin-status \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID", "isAdmin": true}'
```

### Using the Admin Page

Once you have at least one admin user, they can use the Admin page (/admin) to manage other users' admin status.

## Security Implementation

Admin access is enforced at three levels:

1. **UI Level** - Admin-only buttons are disabled or hidden for non-admin users
2. **API Level** - Server-side checks verify admin status before allowing modifications 
3. **Database Level** - Row-level security policies prevent non-admin users from modifying data

## Troubleshooting

If you're experiencing issues with admin access:

1. Verify your admin status by checking user metadata in the Supabase dashboard
2. Try logging out and back in to refresh your user session
3. Check the browser console for any error messages
4. Ensure the database migrations have been applied correctly

## Technical Details

The admin functionality is implemented through:

- Supabase user metadata with an `is_admin` flag
- SQL functions that check admin status
- Row-level security policies in the database (for schedules and policies)
- React components that conditionally render based on admin status

### Row-Level Security Policies

The following tables have admin-specific RLS policies:

1. **Schedules Table**:
   - Only admins can insert, update, or delete schedules
   - All users can view schedules

2. **Policies Table**:
   - Only admins can insert, update, or delete policies
   - All users can view policies
