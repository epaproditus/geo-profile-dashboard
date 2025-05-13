// Admin user utilities
import { supabase } from './supabase';

/**
 * Check if the current user has admin privileges
 * @returns Promise<boolean> - True if user is an admin, false otherwise
 */
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;
    
    // Simplified check: only look for is_admin in metadata
    const isAdmin = user.user_metadata?.is_admin === true;
    
    // If direct check is conclusive, return the result
    if (isAdmin === true) {
      return true;
    }
    
    // As a fallback, check using the database function
    // This is needed for backward compatibility with existing data
    const { data, error } = await supabase.rpc('is_admin', { 
      user_id: user.id 
    });
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error in isCurrentUserAdmin:', error);
    return false;
  }
};

/**
 * Get list of all users with their admin status (admin users only)
 * @returns Promise with all users data or error
 */
export const getUsersWithAdminStatus = async () => {
  try {
    const { data, error } = await supabase.rpc('get_users_with_admin_status');
    
    if (error) {
      console.error('Error fetching users:', error);
      return { data: [], error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error in getUsersWithAdminStatus:', error);
    return { data: [], error };
  }
};

/**
 * Set admin status for a user (can only be called by an admin)
 * @param userId - UUID of the user to update
 * @param isAdmin - boolean value for admin status
 * @returns Promise with result of operation
 */
export const setUserAdminStatus = async (userId: string, isAdmin: boolean) => {
  try {
    // Call the server-side API endpoint that properly handles all admin fields
    const response = await fetch('/api/auth/set-admin-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userId, 
        isAdmin,
        currentUserToken: (await supabase.auth.getSession()).data.session?.access_token
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Error setting admin status:', result);
      return { success: false, error: result.error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error in setUserAdminStatus:', error);
    return { success: false, error };
  }
};
