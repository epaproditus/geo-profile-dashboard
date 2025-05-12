// Check if a user has administrator privileges
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client - same pattern as your other API routes
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get and validate auth token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid authentication token required' 
      });
    }
    
    // Extract token from the header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: error?.message || 'Invalid authentication token'
      });
    }
    
    // Call the is_admin function to check if the user is an admin
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', {
      user_id: user.id
    });
    
    if (adminError) {
      console.error('Error checking admin status:', adminError);
      return res.status(500).json({ 
        error: 'Server error', 
        message: 'Failed to verify administrator privileges'
      });
    }
    
    return res.status(200).json({
      isAdmin: isAdmin === true,
      userId: user.id,
      email: user.email
    });
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      error: 'Server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
}
