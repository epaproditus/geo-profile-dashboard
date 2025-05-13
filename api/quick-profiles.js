// filepath: /Users/abe/Documents/VSCode/geo-profile-dashboard/api/quick-profiles.js
// Quick Profile Scheduler API Endpoint
import { createClient } from '@supabase/supabase-js'
import { simplemdmApi } from '../src/lib/api/simplemdm'

export default async function handler(req, res) {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server error', message: 'Supabase configuration missing' })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Authorization check
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Valid authentication token required' })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: authError?.message || 'Invalid authentication token' 
      })
    }
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await getQuickProfiles(req, res, supabase, user)
      case 'POST':
        return await createQuickProfile(req, res, supabase, user)
      case 'DELETE':
        return await cancelQuickProfile(req, res, supabase, user)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Quick profile scheduler API error:', error)
    return res.status(500).json({
      error: 'Server error',
      message: error.message || 'An unexpected error occurred'
    })
  }
}

// Get all quick profile assignments for the user
async function getQuickProfiles(req, res, supabase, user) {
  try {
    const { data, error } = await supabase.rpc('get_quick_profile_assignments')
    
    if (error) {
      return res.status(500).json({ error: 'Database error', message: error.message })
    }
    
    // Fetch profile and device details to enrich the response
    const enriched = await enrichAssignments(data, supabase)
    
    return res.status(200).json({ data: enriched })
  } catch (error) {
    console.error('Error fetching quick profiles:', error)
    return res.status(500).json({ error: 'Server error', message: error.message })
  }
}

// Create a new quick profile assignment
async function createQuickProfile(req, res, supabase, user) {
  try {
    const { profileId, deviceId, durationMinutes } = req.body
    
    // Validate inputs
    if (!profileId || !deviceId || !durationMinutes) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'profileId, deviceId, and durationMinutes are required' 
      })
    }
    
    // Validate profile ID is one of the allowed profiles
    if (![173535, 173628].includes(Number(profileId))) {
      return res.status(400).json({
        error: 'Invalid profile',
        message: 'Only specific profiles are allowed for quick scheduling'
      })
    }
    
    // Create the assignment
    const { data: assignmentId, error } = await supabase.rpc(
      'create_quick_profile_assignment',
      {
        _profile_id: profileId,
        _device_id: deviceId,
        _duration_minutes: durationMinutes
      }
    )
    
    if (error) {
      return res.status(500).json({ error: 'Database error', message: error.message })
    }
    
    // Immediately push the profile to the device using SimpleMDM API
    try {
      const simpleMdmApiKey = process.env.SIMPLE_MDM_API_KEY
      
      if (!simpleMdmApiKey) {
        return res.status(500).json({ 
          error: 'Server error', 
          message: 'SimpleMDM API key not configured' 
        })
      }
      
      // Make request to SimpleMDM API
      const simpleMdmUrl = `https://a.simplemdm.com/api/v1/profiles/${profileId}/devices/${deviceId}`
      
      const simpleMdmOptions = {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${simpleMdmApiKey}:`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
      
      const pushResponse = await fetch(simpleMdmUrl, simpleMdmOptions)
      
      if (!pushResponse.ok) {
        console.error('Failed to push profile to device:', await pushResponse.text())
        
        // Update the assignment status to 'failed'
        await supabase
          .from('quick_profile_assignments')
          .update({ status: 'failed' })
          .eq('id', assignmentId)
        
        return res.status(500).json({
          error: 'Profile push failed',
          message: 'Failed to push profile to device'
        })
      }
      
      // Update the assignment status to 'installed'
      await supabase
        .from('quick_profile_assignments')
        .update({ status: 'installed' })
        .eq('id', assignmentId)
      
      return res.status(200).json({ 
        success: true, 
        message: 'Profile scheduled and pushed to device',
        data: { assignmentId }
      })
    } catch (apiError) {
      console.error('SimpleMDM API error:', apiError)
      
      // Update the assignment status to 'failed'
      await supabase
        .from('quick_profile_assignments')
        .update({ status: 'failed' })
        .eq('id', assignmentId)
      
      return res.status(500).json({
        error: 'API error',
        message: apiError.message || 'Failed to communicate with SimpleMDM API'
      })
    }
  } catch (error) {
    console.error('Error creating quick profile:', error)
    return res.status(500).json({ error: 'Server error', message: error.message })
  }
}

// Cancel an existing quick profile assignment
async function cancelQuickProfile(req, res, supabase, user) {
  try {
    const { assignmentId } = req.query
    
    if (!assignmentId) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'assignmentId is required' 
      })
    }
    
    // Get the assignment details first
    const { data: assignment, error: fetchError } = await supabase
      .from('quick_profile_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single()
    
    if (fetchError || !assignment) {
      return res.status(404).json({ 
        error: 'Not found', 
        message: 'Assignment not found or access denied' 
      })
    }
    
    // Cancel the assignment
    const { data: success, error } = await supabase.rpc(
      'cancel_quick_profile_assignment',
      { _assignment_id: assignmentId }
    )
    
    if (error) {
      return res.status(500).json({ error: 'Database error', message: error.message })
    }
    
    if (!success) {
      return res.status(404).json({ 
        error: 'Not found', 
        message: 'Assignment not found or access denied' 
      })
    }
    
    // Remove the profile from the device using SimpleMDM API
    try {
      const simpleMdmApiKey = process.env.SIMPLE_MDM_API_KEY
      
      if (!simpleMdmApiKey) {
        return res.status(500).json({ 
          error: 'Server error', 
          message: 'SimpleMDM API key not configured' 
        })
      }
      
      // Make request to SimpleMDM API to remove the profile
      const simpleMdmUrl = `https://a.simplemdm.com/api/v1/profiles/${assignment.profile_id}/devices/${assignment.device_id}`
      
      const simpleMdmOptions = {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${simpleMdmApiKey}:`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
      
      await fetch(simpleMdmUrl, simpleMdmOptions)
      
      return res.status(200).json({ 
        success: true, 
        message: 'Profile assignment canceled and removed from device' 
      })
    } catch (apiError) {
      console.error('SimpleMDM API error:', apiError)
      return res.status(500).json({
        error: 'API error',
        message: apiError.message || 'Failed to communicate with SimpleMDM API'
      })
    }
  } catch (error) {
    console.error('Error canceling quick profile:', error)
    return res.status(500).json({ error: 'Server error', message: error.message })
  }
}

// Helper to enrich assignments with profile and device details
async function enrichAssignments(assignments, supabase) {
  // Get the SimpleMDM profile and device details to add to the assignments
  const simpleMdmApiKey = process.env.SIMPLE_MDM_API_KEY
  
  if (!simpleMdmApiKey) {
    console.warn('SimpleMDM API key not configured, returning raw assignments')
    return assignments
  }
  
  try {
    const simpleMdmUrl = "https://a.simplemdm.com/api/v1"
    const simpleMdmHeaders = {
      'Authorization': `Basic ${Buffer.from(`${simpleMdmApiKey}:`).toString('base64')}`,
      'Content-Type': 'application/json'
    }
    
    // Get profile details for the specific IDs we care about (173535 and 173628)
    const profilesResponse = await fetch(`${simpleMdmUrl}/profiles`, {
      headers: simpleMdmHeaders
    })
    
    const profilesData = await profilesResponse.json()
    const profilesMap = {}
    
    if (profilesData && profilesData.data) {
      profilesData.data.forEach(profile => {
        profilesMap[profile.id] = {
          name: profile.attributes.name,
          description: profile.attributes.description,
          type: profile.type
        }
      })
    }
    
    // Get all devices
    const devicesResponse = await fetch(`${simpleMdmUrl}/devices`, {
      headers: simpleMdmHeaders
    })
    
    const devicesData = await devicesResponse.json()
    const devicesMap = {}
    
    if (devicesData && devicesData.data) {
      devicesData.data.forEach(device => {
        devicesMap[device.id] = {
          name: device.attributes.name,
          serialNumber: device.attributes.serial_number,
          lastSeen: device.attributes.last_seen_at
        }
      })
    }
    
    // Enrich the assignments with profile and device details
    return assignments.map(assignment => ({
      ...assignment,
      profile: profilesMap[assignment.profile_id] || { name: `Profile ${assignment.profile_id}` },
      device: devicesMap[assignment.device_id] || { name: `Device ${assignment.device_id}` }
    }))
  } catch (error) {
    console.error('Error enriching assignments:', error)
    return assignments
  }
}
