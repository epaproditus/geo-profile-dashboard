// Script to synchronize the is_super_admin fields for all users
// Run with: node scripts/sync-admin-fields.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
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

async function syncAdminFields() {
  try {
    console.log('Fetching all users...');
    
    // Get all users
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    
    console.log(`Found ${users.users.length} users. Checking for admin status inconsistencies...`);
    
    let fixedCount = 0;
    
    // Check each user and sync the fields if needed
    for (const user of users.users) {
      // Check for inconsistencies in admin status
      const metaIsAdmin = user.user_metadata?.is_admin === true;
      const metaIsSuperAdmin = user.user_metadata?.is_super_admin === true;
      const rootIsSuperAdmin = user.is_super_admin === true;
      const isAdmin = user.user_metadata?.role === 'admin';
      
      // Log current status
      console.log(`User ${user.email || user.id}:`);
      console.log(`  - meta.is_admin: ${metaIsAdmin}`);
      console.log(`  - meta.is_super_admin: ${metaIsSuperAdmin}`);
      console.log(`  - root.is_super_admin: ${rootIsSuperAdmin}`);
      console.log(`  - meta.role: ${user.user_metadata?.role}`);
      
      // Check if fields are inconsistent
      if (metaIsAdmin || metaIsSuperAdmin || rootIsSuperAdmin || isAdmin) {
        // Some admin flag is set, make sure all necessary ones are set
        if (!metaIsAdmin && !metaIsSuperAdmin && !rootIsSuperAdmin) {
          console.log(`  → No inconsistencies found, user has role admin but not super admin`);
          continue;
        }
        
        // Check for inconsistencies
        if (metaIsSuperAdmin !== rootIsSuperAdmin) {
          console.log(`  → Found inconsistency, fixing...`);
          
          // Use RPC function to fix both fields
          const { error: rpcError } = await supabase.rpc('set_super_admin_status', {
            target_user_id: user.id,
            admin_status: true
          });
          
          if (rpcError) {
            console.error(`  ✗ Error fixing user ${user.email || user.id}:`, rpcError);
          } else {
            console.log(`  ✓ Fixed user ${user.email || user.id}`);
            fixedCount++;
          }
        } else {
          console.log(`  → No inconsistencies found`);
        }
      } else {
        console.log(`  → User is not an admin, skipping`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log(`Completed! Fixed ${fixedCount} users.`);
  } catch (error) {
    console.error('Error syncing admin fields:', error);
  }
}

// Run the sync function
syncAdminFields().catch(console.error);
