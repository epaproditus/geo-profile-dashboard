// API route for handling quick profile installations
// This allows for temporary profile installations with automatic removal

import { supabase } from '../src/lib/supabase';
import { simplemdmApi } from './simplemdm/api';

export default async function handler(req, res) {
  // Get the user from the auth token
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      message: 'Unauthorized: Missing or invalid authentication token' 
    });
  }
  
  // Extract the token
  const token = authHeader.split(' ')[1];
  
  // Verify token with Supabase
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.error('Auth error:', authError);
    return res.status(401).json({ 
      message: 'Unauthorized: Invalid authentication token' 
    });
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return getQuickProfiles(req, res, user);
    case 'POST':
      return createQuickProfile(req, res, user);
    case 'DELETE':
      return cancelQuickProfile(req, res, user);
    default:
      return res.status(405).json({ message: 'Method not allowed' });
  }
}

// Get quick profiles for the current user
async function getQuickProfiles(req, res, user) {
  try {
    // Fetch assignments for the current user
    const { data, error } = await supabase
      .from('quick_profile_assignments')
      .select(`
        id,
        profile_id,
        device_id,
        user_id,
        status,
        install_at,
        remove_at,
        profile:profile_id (name),
        device:device_id (name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return res.status(200).json({ data });
  } catch (error) {
    console.error('Error fetching quick profiles:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch profile assignments',
      error: error.message 
    });
  }
}

// Create a new quick profile assignment
async function createQuickProfile(req, res, user) {
  try {
    const { profileId, deviceId, durationMinutes } = req.body;
    
    if (!profileId || !deviceId || !durationMinutes) {
      return res.status(400).json({ 
        message: 'Missing required fields: profileId, deviceId, durationMinutes' 
      });
    }
    
    // Calculate install and remove times
    const now = new Date();
    const removeAt = new Date(now.getTime() + (durationMinutes * 60 * 1000));
    
    // Insert record in database
    const { data: assignment, error } = await supabase
      .from('quick_profile_assignments')
      .insert([
        { 
          profile_id: profileId,
          device_id: deviceId,
          user_id: user.id,
          status: 'scheduled',
          install_at: now.toISOString(),
          remove_at: removeAt.toISOString()
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    
    // Push profile to device using SimpleMDM API
    try {
      await simplemdmApi.installProfile(profileId, deviceId);
      
      // Update status to indicate successful installation
      await supabase
        .from('quick_profile_assignments')
        .update({ status: 'installed' })
        .eq('id', assignment.id);
      
      return res.status(200).json({ 
        message: 'Profile scheduled and installed successfully',
        data: assignment
      });
    } catch (apiError) {
      // Update status to indicate failure
      await supabase
        .from('quick_profile_assignments')
        .update({ status: 'failed', error_message: apiError.message })
        .eq('id', assignment.id);
      
      throw apiError;
    }
  } catch (error) {
    console.error('Error scheduling profile:', error);
    return res.status(500).json({ 
      message: 'Failed to schedule profile',
      error: error.message 
    });
  }
}

// Cancel a quick profile assignment
async function cancelQuickProfile(req, res, user) {
  try {
    const { assignmentId } = req.query;
    
    if (!assignmentId) {
      return res.status(400).json({ 
        message: 'Missing required assignmentId parameter' 
      });
    }
    
    // Check if the assignment belongs to the user
    const { data: assignment, error: fetchError } = await supabase
      .from('quick_profile_assignments')
      .select('*')
      .eq('id', assignmentId)
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !assignment) {
      return res.status(404).json({ 
        message: 'Assignment not found or does not belong to this user' 
      });
    }
    
    // Only allow cancellation for scheduled or installed profiles
    if (assignment.status !== 'scheduled' && assignment.status !== 'installed') {
      return res.status(400).json({ 
        message: `Cannot cancel assignment with status: ${assignment.status}` 
      });
    }
    
    // Remove profile from device using SimpleMDM API
    try {
      if (assignment.status === 'installed') {
        await simplemdmApi.removeProfile(assignment.profile_id, assignment.device_id);
      }
      
      // Update status to indicate removal
      await supabase
        .from('quick_profile_assignments')
        .update({ status: 'removed', remove_at: new Date().toISOString() })
        .eq('id', assignmentId);
      
      return res.status(200).json({ 
        message: 'Profile assignment canceled successfully' 
      });
    } catch (apiError) {
      // Update status to indicate failure if API call fails
      await supabase
        .from('quick_profile_assignments')
        .update({ 
          status: 'failed', 
          error_message: `Failed to remove: ${apiError.message}` 
        })
        .eq('id', assignmentId);
      
      throw apiError;
    }
  } catch (error) {
    console.error('Error canceling assignment:', error);
    return res.status(500).json({ 
      message: 'Failed to cancel profile assignment',
      error: error.message 
    });
  }
}
