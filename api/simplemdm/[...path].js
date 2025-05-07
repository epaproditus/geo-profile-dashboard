// /api/simplemdm/[...path].js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    // Initialize Supabase admin client for auth checks
    const supabaseUrl = process.env.SUPABASE_URL
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
      
      console.log(`Authenticated request from ${user.email}`)
    }
    
    // Get the API key from environment variables - try multiple possible names
    const apiKey = process.env.SIMPLEMDM_API_KEY || process.env.VITE_SIMPLEMDM_API_KEY
    
    // Debug environment variables and request info
    console.log('Request URL:', req.url)
    console.log('Environment variables check:', !!apiKey)
    console.log('Request query:', req.query)
    
    if (!apiKey) {
      console.error('API Key not found in environment variables')
      return res.status(500).json({ 
        error: 'SimpleMDM API key not configured'
      })
    }
    
    // In Vercel, the path parameter might be handled differently
    // Let's try to extract the path directly from the URL if path query is empty
    let path = ''
    
    if (req.query.path) {
      // If path exists in query (standard Next.js behavior)
      path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path
    } else {
      // Alternative method: Extract path from URL
      const urlPath = req.url || ''
      const pathMatch = urlPath.match(/\/api\/simplemdm\/(.+?)(?:\?|$)/)
      if (pathMatch && pathMatch[1]) {
        path = pathMatch[1]
      } else {
        // Default to "devices" if we can't extract a path
        path = "devices"
      }
    }
    
    console.log('Extracted path:', path)
    
    // Build the target URL for SimpleMDM API
    const targetUrl = `https://a.simplemdm.com/api/v1/${path}`
    
    // Create query string
    let queryString = ''
    if (req.url && req.url.includes('?')) {
      queryString = req.url.substring(req.url.indexOf('?'))
    }
    
    const fullUrl = `${targetUrl}${queryString}`
    console.log(`Proxying request to: ${fullUrl}`)
    
    // Create authorization header with API key
    const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`
    
    // Forward the request to SimpleMDM
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined
    })
    
    // Get the response data
    const contentType = response.headers.get('content-type')
    let data
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      data = { message: text }
    }
    
    // Return the response to the client
    return res.status(response.status).json(data)
  } catch (error) {
    console.error('API Proxy Error:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch from SimpleMDM API',
      details: error.message
    })
  }
}