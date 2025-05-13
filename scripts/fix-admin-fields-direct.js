// Script to directly fix the is_super_admin fields using SQL
// Run with: node scripts/fix-admin-fields-direct.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';
const { Pool } = pg;

// Load environment variables
dotenv.config();

// Get database connection details
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT || 5432;
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;

// Check if we have direct database credentials or need to extract from Supabase URL
async function getDbCredentials() {
  // If we have all direct DB credentials, use them
  if (dbHost && dbName && dbUser && dbPassword) {
    return {
      host: dbHost,
      port: parseInt(dbPort),
      database: dbName,
      user: dbUser,
      password: dbPassword
    };
  }
  
  // No direct DB credentials, we need to extract from Supabase
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Either direct database credentials or Supabase credentials are required');
    process.exit(1);
  }
  
  // Initialize Supabase client for getting connection info
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  
  // Get connection info from Supabase
  console.log('Getting connection info from Supabase...');
  
  try {
    // First try to use the get-db-connection-string feature
    const { data: connectionString, error } = await supabase.rpc('get_connection_string');
    
    if (!error && connectionString) {
      // Parse the connection string to extract credentials
      // Format: postgres://username:password@host:port/database
      const connRegex = /postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
      const match = connectionString.match(connRegex);
      
      if (match) {
        return {
          user: match[1],
          password: match[2],
          host: match[3],
          port: parseInt(match[4]),
          database: match[5]
        };
      }
    }
    
    // Fall back to fetching users to extract connection info
    console.log('Connection string not available, falling back to config...');
    console.error('ERROR: Cannot get direct database connection. Please add DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD environment variables.');
    process.exit(1);
    
  } catch (error) {
    console.error('Error getting database connection info:', error);
    process.exit(1);
  }
}

async function main() {
  try {
    // Get database credentials
    const dbCredentials = await getDbCredentials();
    console.log(`Got database credentials for host: ${dbCredentials.host} and database: ${dbCredentials.database}`);
    
    // Create a new client
    const pool = new Pool({
      ...dbCredentials,
      ssl: true
    });
    
    // Connect to database
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected to database successfully');
    
    try {
      // First, get all users with their admin status
      console.log('Fetching all users...');
      const { rows: users } = await client.query(`
        SELECT 
          id, 
          email, 
          raw_user_meta_data, 
          is_super_admin
        FROM auth.users
      `);
      
      console.log(`Found ${users.length} users. Checking for admin status inconsistencies...`);
      
      // Count how many users we've fixed
      let fixedCount = 0;
      
      for (const user of users) {
        const email = user.email || user.id;
        const metaIsAdmin = user.raw_user_meta_data?.is_admin === true;
        const metaIsSuperAdmin = user.raw_user_meta_data?.is_super_admin === true;
        const rootIsSuperAdmin = user.is_super_admin === true;
        const isAdmin = user.raw_user_meta_data?.role === 'admin';
        
        // Log current status
        console.log(`User ${email}:`);
        console.log(`  - meta.is_admin: ${metaIsAdmin}`);
        console.log(`  - meta.is_super_admin: ${metaIsSuperAdmin}`);
        console.log(`  - root.is_super_admin: ${rootIsSuperAdmin}`);
        console.log(`  - meta.role: ${user.raw_user_meta_data?.role}`);
        
        // If the user should be an admin
        const shouldBeAdmin = metaIsAdmin || metaIsSuperAdmin || isAdmin;
        
        // If any admin field is true, it should be true in both places
        if (shouldBeAdmin || rootIsSuperAdmin) {
          // Check if fields are inconsistent
          if (metaIsSuperAdmin !== rootIsSuperAdmin) {
            console.log(`  → Found inconsistency, fixing...`);
            
            // Determine which value to use (prefer true)
            const correctAdminValue = metaIsSuperAdmin || rootIsSuperAdmin;
            
            // Update both fields
            try {
              // First update the root field
              await client.query(`
                UPDATE auth.users 
                SET is_super_admin = $1 
                WHERE id = $2
              `, [correctAdminValue, user.id]);
              
              // Then update the metadata field
              let updatedMetadata = { ...user.raw_user_meta_data };
              updatedMetadata.is_super_admin = correctAdminValue;
              
              await client.query(`
                UPDATE auth.users 
                SET raw_user_meta_data = $1 
                WHERE id = $2
              `, [updatedMetadata, user.id]);
              
              console.log(`  ✓ Fixed user ${email}`);
              fixedCount++;
            } catch (error) {
              console.error(`  ✗ Error fixing user ${email}:`, error);
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
      
    } finally {
      // Release the client back to the pool
      client.release();
      
      // Close the pool entirely
      await pool.end();
    }
  } catch (error) {
    console.error('Error syncing admin fields:', error);
  }
}

// Run the sync function
main().catch(console.error);
