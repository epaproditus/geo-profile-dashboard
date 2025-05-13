# Admin User Management API

This documentation will guide you through setting up and using the Admin User Management API for the Geo Profile Dashboard.

## Overview

The Admin User Management API provides endpoints for managing user admin privileges. The API makes sure that all admin fields in user records stay consistent, including:

- `is_admin` in the user metadata
- `is_super_admin` in the user metadata
- `is_super_admin` at the root level of the auth.users table
- `role` set to "admin" in the user metadata

## Prerequisites

- Supabase project with service role key
- Environment variables properly set up

## Setup Instructions

1. **Set up environment variables**:
   - Copy `.env.example` to `.env`
   - Set your Supabase URL and service role key
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Run the setup script**:
   ```bash
   chmod +x setup-admin-api.sh
   ./setup-admin-api.sh
   ```

3. **Verify the installation**:
   - Access the admin dashboard at: http://localhost:8080/admin
   - Check that you can toggle admin privileges

## API Endpoints

### Set Admin Status

**Endpoint**: `/api/auth/set-admin-status`

**Method**: POST

**Body**:
```json
{
  "userId": "user-uuid-here",
  "isAdmin": true,
  "currentUserToken": "optional-auth-token-for-permission-check"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User 123e4567-e89b-12d3-a456-426614174000 admin status set to true"
}
```

## Troubleshooting

If you encounter issues with the admin API, please refer to the [Admin API Troubleshooting Guide](ADMIN_API_TROUBLESHOOTING.md).

Common issues and solutions:
- Environment variables not properly set
- Supabase service role key permissions
- Database function errors
- Path-to-regexp errors with API routes

## Debug Mode

For troubleshooting, you can run the server in debug mode:

```bash
chmod +x run-with-debug.sh
./run-with-debug.sh
```

This will:
1. Verify all environment variables
2. Enable verbose logging
3. Fix common routing issues
4. Start the server with debugging enabled

## Admin Database Functions

The following SQL functions are used by this API:

1. `is_admin(user_id UUID)` - Checks if a user has admin privileges
2. `get_users_with_admin_status()` - Lists all users with their admin status
3. `update_root_super_admin(target_user_id UUID, admin_status BOOLEAN)` - Updates the root-level admin field

## Client-Side Usage

In your frontend code, you can use the admin utilities from `src/lib/admin.ts`:

```typescript
import { isCurrentUserAdmin, getUsersWithAdminStatus, setUserAdminStatus } from '@/lib/admin';

// Check if current user is an admin
const isAdmin = await isCurrentUserAdmin();

// Get all users with their admin status
const { data, error } = await getUsersWithAdminStatus();

// Set admin status for a user
const { success, error } = await setUserAdminStatus(userId, true);
```
