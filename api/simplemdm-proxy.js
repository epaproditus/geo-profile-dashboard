// This file replaces the Next.js dynamic routing with Express compatible routing
import { createClient } from '@supabase/supabase-js'

// Import the original handler logic
import * as originalHandler from './simplemdm/[...path].js';

export default async function proxyHandler(req, res) {
  try {
    // Initialize Supabase admin client for auth checks
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    // Check if Supabase credentials are configured
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn("Supabase credentials missing - auth check will be skipped")
    } else {
      // Create Supabase admin client
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      
      // Get the authorization header
      const authHeader = req.headers.authorization
      
      // If auth header is missing or not in Bearer format, return unauthorized
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Valid authentication token required' 
        })
      }
      
      // Extract token from the header
      const token = authHeader.replace('Bearer ', '')
      
      // Verify the token with Supabase
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      
      if (error || !user) {
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: error?.message || 'Invalid authentication token' 
        })
      }
      
      // Get the path parts from the URL to check if this is a profile push operation
      const urlPath = req.url.replace(/^\/api\/simplemdm\//, '')
      
      // Check if this is a profile push operation (POST to /profiles/{id}/devices/{id})
      const isProfilePush = req.method === 'POST' && /^profiles\/\d+\/devices\/\d+$/.test(urlPath)
      
      // Check if user is admin
      const { data: isAdmin, error: adminCheckError } = await supabaseAdmin.rpc('is_admin', {
        user_id: user.id
      })
      
      if (adminCheckError) {
        console.error('Error checking admin status:', adminCheckError)
        return res.status(500).json({ error: 'Server error', message: 'Failed to verify permissions' })
      }
      
      // If this is a profile push by a non-admin user, check if the profile is allowed for non-admin installation
      if (isProfilePush && !isAdmin) {
        // Extract the profile ID from the path - format is "profiles/{profile_id}/devices/{device_id}"
        const matches = urlPath.match(/^profiles\/(\d+)\/devices\/\d+$/)
        if (matches && matches[1]) {
          const profileId = parseInt(matches[1], 10)
          
          // Check if this profile is allowed for non-admin installation
          const { data: isAllowed, error: allowedCheckError } = await supabaseAdmin.rpc('is_profile_non_admin_installable', {
            profile_id_param: profileId
          })
          
          if (allowedCheckError) {
            console.error('Error checking if profile is installable by non-admin:', allowedCheckError)
            return res.status(500).json({ error: 'Server error', message: 'Failed to verify profile installation permissions' })
          }
          
          if (!isAllowed) {
            return res.status(403).json({ 
              error: 'Forbidden', 
              message: 'You do not have permission to install this profile. Please contact an administrator.' 
            })
          }
        }
      }
      // If this is not a profile push, check for admin privileges
      else if (!isProfilePush && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden', message: 'Admin privileges required' })
      }
    }
    
    // User is authorized, proceed with the SimpleMDM proxy request
    
    // Extract the SimpleMDM API key from environment
    const simpleMdmApiKey = process.env.SIMPLE_MDM_API_KEY
    
    if (!simpleMdmApiKey) {
      return res.status(500).json({ error: 'Server error', message: 'SimpleMDM API key not configured' })
    }
    
    // Get the path parts from the URL after /api/simplemdm/
    const urlPath = req.url.replace(/^\/api\/simplemdm\//, '')
    
    // Set up the SimpleMDM API request
    const simpleMdmUrl = `https://a.simplemdm.com/api/v1/${urlPath}`
    
    // Create the SimpleMDM request options
    const simpleMdmOptions = {
      method: req.method,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${simpleMdmApiKey}:`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    }
    
    // Add body if present
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      simpleMdmOptions.body = JSON.stringify(req.body)
    }
    
    // Make the request to SimpleMDM
    const response = await fetch(simpleMdmUrl, simpleMdmOptions)
    
    // Get the response data
    const responseData = await response.json()
    
    // Return the SimpleMDM response
    return res.status(response.status).json(responseData)
  } catch (error) {
    console.error('SimpleMDM proxy error:', error)
    return res.status(500).json({
      error: 'Server error',
      message: error.message || 'An unexpected error occurred'
    })
  }
}
