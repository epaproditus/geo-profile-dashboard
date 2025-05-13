import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SimpleMDM API key
const SIMPLEMDM_API_KEY = process.env.SIMPLEMDM_API_KEY;

export default async function handler(req, res) {
  // Extract the JWT token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization token' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    const userId = user.id;
    
    // Handle different HTTP methods
    if (req.method === 'GET') {
      return await getQuickProfileAssignments(req, res, userId);
    } else if (req.method === 'POST') {
      return await createQuickProfileAssignment(req, res, userId);
    } else if (req.method === 'DELETE') {
      return await cancelQuickProfileAssignment(req, res, userId);
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Get quick profile assignments for the current user
 */
async function getQuickProfileAssignments(req, res, userId) {
  try {
    // Get assignments from the database
    const { data, error } = await supabase.rpc('get_quick_profile_assignments');
    
    if (error) throw error;
    
    // Enhance the response with profile and device information
    const enhancedData = await Promise.all(data.map(async (assignment) => {
      // Get profile information from SimpleMDM
      const profileInfo = await fetchSimpleMDMProfile(assignment.profile_id);
      
      // Get device information from SimpleMDM
      const deviceInfo = await fetchSimpleMDMDevice(assignment.device_id);
      
      return {
        ...assignment,
        profile: profileInfo,
        device: deviceInfo
      };
    }));
    
    return res.status(200).json({ data: enhancedData });
  } catch (error) {
    console.error('Error getting assignments:', error);
    return res.status(500).json({ message: 'Failed to get assignments' });
  }
}

/**
 * Create a new quick profile assignment
 */
async function createQuickProfileAssignment(req, res, userId) {
  const { profileId, deviceId, durationMinutes } = req.body;
  
  if (!profileId || !deviceId || !durationMinutes) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  // Check if the profileId is in the allowed list
  const allowedProfileIds = [173535, 173628];
  if (!allowedProfileIds.includes(parseInt(profileId))) {
    return res.status(403).json({ message: 'Profile ID not allowed for quick scheduling' });
  }
  
  try {
    // Create the assignment in the database
    const { data, error } = await supabase.rpc(
      'create_quick_profile_assignment',
      {
        _profile_id: parseInt(profileId),
        _device_id: parseInt(deviceId),
        _duration_minutes: parseInt(durationMinutes)
      }
    );
    
    if (error) throw error;
    
    // Push the profile to the device using SimpleMDM API
    const profilePushResult = await pushProfileToDevice(profileId, deviceId);
    
    if (!profilePushResult.success) {
      // Update status to failed if the push failed
      await supabase
        .from('quick_profile_assignments')
        .update({ status: 'failed' })
        .eq('id', data);
        
      return res.status(500).json({ message: 'Failed to push profile to device' });
    }
    
    // Update status to installed
    await supabase
      .from('quick_profile_assignments')
      .update({ status: 'installed' })
      .eq('id', data);
    
    return res.status(201).json({ 
      message: 'Profile assignment created successfully',
      assignmentId: data
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return res.status(500).json({ message: 'Failed to create assignment' });
  }
}

/**
 * Cancel a quick profile assignment
 */
async function cancelQuickProfileAssignment(req, res, userId) {
  const { assignmentId } = req.query;
  
  if (!assignmentId) {
    return res.status(400).json({ message: 'Missing assignment ID' });
  }
  
  try {
    // Get the assignment first to check if it belongs to the user
    const { data: assignments, error: fetchError } = await supabase
      .from('quick_profile_assignments')
      .select('profile_id, device_id, status')
      .eq('id', assignmentId)
      .eq('user_id', userId);
    
    if (fetchError) throw fetchError;
    
    if (!assignments || assignments.length === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    const assignment = assignments[0];
    
    // If the assignment is installed, try to remove the profile
    if (assignment.status === 'installed') {
      try {
        await removeProfileFromDevice(assignment.profile_id, assignment.device_id);
      } catch (removeError) {
        console.error('Error removing profile:', removeError);
        // Continue with cancellation even if removal fails
      }
    }
    
    // Update the assignment status
    const { data, error } = await supabase.rpc(
      'cancel_quick_profile_assignment',
      { _assignment_id: parseInt(assignmentId) }
    );
    
    if (error) throw error;
    
    return res.status(200).json({ message: 'Assignment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling assignment:', error);
    return res.status(500).json({ message: 'Failed to cancel assignment' });
  }
}

/**
 * Fetch profile information from SimpleMDM
 */
async function fetchSimpleMDMProfile(profileId) {
  try {
    const response = await fetch(`https://a.simplemdm.com/api/v1/profiles/${profileId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(SIMPLEMDM_API_KEY + ':').toString('base64')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      id: data.data.id,
      name: data.data.attributes.name
    };
  } catch (error) {
    console.error(`Error fetching profile ${profileId}:`, error);
    return { id: profileId, name: `Profile ${profileId}` };
  }
}

/**
 * Fetch device information from SimpleMDM
 */
async function fetchSimpleMDMDevice(deviceId) {
  try {
    const response = await fetch(`https://a.simplemdm.com/api/v1/devices/${deviceId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(SIMPLEMDM_API_KEY + ':').toString('base64')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch device: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      id: data.data.id,
      name: data.data.attributes.name || `Device ${deviceId}`
    };
  } catch (error) {
    console.error(`Error fetching device ${deviceId}:`, error);
    return { id: deviceId, name: `Device ${deviceId}` };
  }
}

/**
 * Push a profile to a device using SimpleMDM API
 */
async function pushProfileToDevice(profileId, deviceId) {
  try {
    const response = await fetch(`https://a.simplemdm.com/api/v1/devices/${deviceId}/profiles/${profileId}/install`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(SIMPLEMDM_API_KEY + ':').toString('base64')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to push profile: ${response.statusText}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error pushing profile:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove a profile from a device using SimpleMDM API
 */
async function removeProfileFromDevice(profileId, deviceId) {
  try {
    const response = await fetch(`https://a.simplemdm.com/api/v1/devices/${deviceId}/profiles/${profileId}/remove`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(SIMPLEMDM_API_KEY + ':').toString('base64')}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to remove profile: ${response.statusText}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error removing profile:', error);
    return { success: false, error: error.message };
  }
}