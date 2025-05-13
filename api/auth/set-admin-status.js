// Set admin status for a user
import { createClient } from '@supabase/supabase-js';
// Ensure this file is treated as an ES module

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
} else {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export default async function handler(req, res) {
  console.log('Admin status API called:', req.method, req.body);
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Check if Supabase is initialized
  if (!supabase) {
    console.error('Supabase client is not initialized');
    return res.status(500).json({ 
      error: 'Server configuration error', 
      message: 'Database connection not available'
    });
  }
  
  try {
    const { userId, isAdmin, currentUserToken } = req.body;

    // Validate required parameters
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    if (typeof isAdmin !== 'boolean') {
      return res.status(400).json({ error: 'isAdmin parameter must be a boolean' });
    }
    
    // If a token is provided, check if the current user is an admin
    if (currentUserToken) {
      // Verify the token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(currentUserToken);
      
      if (error || !user) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: error?.message || 'Invalid authentication token'
        });
      }
      
      // Only allow admins to set admin status
      const { data: callerIsAdmin, error: adminCheckError } = await supabase.rpc('is_admin', {
        user_id: user.id
      });
      
      if (adminCheckError) {
        console.error('Error checking caller admin status:', adminCheckError);
        return res.status(500).json({ error: 'Failed to verify administrator privileges' });
      }
      
      if (!callerIsAdmin) {
        return res.status(403).json({ error: 'Only administrators can set admin status' });
      }
    } else {
      // If no token is provided, check if this is being called internally on the server
      const host = req.headers.host || '';
      if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
        return res.status(401).json({ error: 'Unauthorized access' });
      }
      
      console.log('Running in server context, bypassing admin check');
    }
    
    // First get current user metadata to preserve other fields
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError) {
      console.error('Error getting user data:', userError);
      return res.status(500).json({ error: 'Failed to get user data' });
    }
    
    // Update both metadata and root level admin fields for compatibility during transition
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { 
        is_admin: isAdmin,
        is_super_admin: isAdmin
      }
    });
    
    if (error) {
      console.error('Error updating user metadata:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }
    
    // Also update the root is_super_admin field directly with SQL
    try {
      console.log(`Updating root is_super_admin field to ${isAdmin}`);
      const { error: sqlError } = await supabase.rpc('update_root_super_admin', { 
        target_user_id: userId, 
        admin_status: isAdmin 
      });
      
      if (sqlError) {
        console.error('Error updating root is_super_admin field:', sqlError);
        // Continue even if this fails - metadata update is more important
      }
    } catch (sqlErr) {
      console.error('Exception updating root is_super_admin field:', sqlErr);
    }
    
    return res.status(200).json({
      success: true,
      message: `User ${userId} admin status set to ${isAdmin}`
    });
  } catch (error) {
    console.error('Set admin status error:', error);
    return res.status(500).json({
      error: 'Server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
}
