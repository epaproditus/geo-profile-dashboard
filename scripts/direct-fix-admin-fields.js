#!/usr/bin/env node
// filepath: /Users/abe/Documents/VSCode/geo-profile-dashboard/scripts/direct-fix-admin-fields.js
// This script directly executes SQL to fix inconsistencies between root and metadata admin fields
// Run with: node scripts/direct-fix-admin-fields.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function directFixAdminFields() {
  try {
    console.log('Fetching all users...');
    
    // Get all users
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    
    console.log(`Found ${users.users.length} users. Checking for admin status inconsistencies...`);
    
    for (const user of users.users) {
      // Check both admin fields
      const metaIsAdmin = user.user_metadata?.is_admin === true;
      const metaIsSuperAdmin = user.user_metadata?.is_super_admin === true;
      const rootIsSuperAdmin = user.is_super_admin === true;
      const isRoleAdmin = user.user_metadata?.role === 'admin';
      
      // Log current status
      console.log(`User ${user.email || user.id}:`);
      console.log(`  - meta.is_admin: ${metaIsAdmin}`);
      console.log(`  - meta.is_super_admin: ${metaIsSuperAdmin}`);
      console.log(`  - root.is_super_admin: ${rootIsSuperAdmin}`);
      console.log(`  - meta.role: ${user.user_metadata?.role}`);
      
      // Define what the admin status should be based on any positive indicator
      const shouldBeAdmin = metaIsAdmin || metaIsSuperAdmin || rootIsSuperAdmin || isRoleAdmin;
      
      // Check if fields are inconsistent
      const isInconsistent = metaIsSuperAdmin !== rootIsSuperAdmin;
      
      if (isInconsistent) {
        console.log(`  → Found inconsistency, fixing with direct SQL...`);
        
        // Execute direct SQL to fix the issue - bypasses function permission checks
        const { error: sqlError } = await supabase.rpc('execute_admin_sql', {
          user_id: user.id,
          admin_status: shouldBeAdmin
        });
        
        if (sqlError) {
          console.error(`  ✗ Error with SQL fix:`, sqlError);
          
          // Fall back to direct metadata update
          console.log(`  → Falling back to admin API update...`);
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            {
              user_metadata: {
                ...user.user_metadata,
                is_admin: shouldBeAdmin,
                is_super_admin: shouldBeAdmin
              }
            }
          );
          
          if (updateError) {
            console.error(`  ✗ Error updating user metadata:`, updateError);
          } else {
            console.log(`  ✓ Fixed user metadata via admin API`);
          }
        } else {
          console.log(`  ✓ Fixed user ${user.email || user.id} with direct SQL`);
        }
      } else if (shouldBeAdmin) {
        console.log(`  → User is admin, but no inconsistencies found`);
      } else {
        console.log(`  → User is not an admin, skipping`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log(`Done checking admin fields.`);
  } catch (error) {
    console.error('Error in direct fix script:', error);
  }
}

// First create the helper function to execute SQL directly
async function createHelperFunction() {
  try {
    console.log('Creating helper SQL function...');
    
    // This function bypasses the admin check by using SECURITY DEFINER
    const { error } = await supabase.rpc('create_admin_sql_helper');
    
    if (error) {
      // Function might already exist or there was an error
      console.log('Trying to create the helper function directly...');
      
      // Create the function directly with SQL
      const { error: sqlError } = await supabase.sql(`
        CREATE OR REPLACE FUNCTION public.execute_admin_sql(user_id uuid, admin_status boolean)
        RETURNS boolean AS $$
        BEGIN
          -- Update both the root field and the metadata field
          UPDATE auth.users
          SET 
            is_super_admin = admin_status,
            raw_user_meta_data = 
              CASE 
                WHEN raw_user_meta_data IS NULL THEN 
                  jsonb_build_object('is_super_admin', admin_status, 'is_admin', admin_status)
                ELSE
                  raw_user_meta_data || 
                  jsonb_build_object('is_super_admin', admin_status, 'is_admin', admin_status)
              END
          WHERE id = user_id;
          
          RETURN true;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `);
      
      if (sqlError) {
        console.error('Error creating helper function:', sqlError);
        return false;
      }
    }
    
    console.log('Helper function created or already exists');
    return true;
  } catch (error) {
    console.error('Error creating helper function:', error);
    return false;
  }
}

// Run everything
async function main() {
  const success = await createHelperFunction();
  if (success) {
    await directFixAdminFields();
  } else {
    console.error('Failed to create helper function, cannot continue');
  }
}

main().catch(console.error);
