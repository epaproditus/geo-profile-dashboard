import { createClient } from '@supabase/supabase-js';
import { simplemdmApi } from '../../src/lib/api/simplemdm';

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

// Test endpoint for manually testing SimpleMDM profile push
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get profile ID and device ID from request body
    const { profileId, deviceId, apiKey } = req.body;
    
    if (!profileId || !deviceId) {
      return res.status(400).json({ error: 'Missing profileId or deviceId' });
    }
    
    // If API key is provided, use it
    // Otherwise, get it from the secure environment
    const simpleMdmApiKey = apiKey || process.env.SIMPLEMDM_API_KEY;
    
    if (!simpleMdmApiKey) {
      return res.status(500).json({ error: 'SimpleMDM API key not configured' });
    }
    
    // Use the updated API client to push the profile
    try {
      // Create a test schedule entry to track this push
      const { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
          name: 'API Test Push',
          profile_id: profileId,
          action_type: 'push_profile',
          schedule_type: 'one_time',
          enabled: true
        })
        .select()
        .single();
        
      if (scheduleError) {
        console.error('Error creating test schedule:', scheduleError);
        // Continue without a schedule ID
      }
      
      // Push the profile
      const result = await simplemdmApi.pushProfileToDevice(profileId, deviceId, schedule?.id);
      
      return res.status(200).json({
        success: true,
        message: `Profile ${profileId} pushed to device ${deviceId}`,
        result,
        scheduleId: schedule?.id
      });
    } catch (error) {
      throw new Error(`SimpleMDM API error: ${error.message}`);
    }
  } catch (error) {
    console.error('Test profile push failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
