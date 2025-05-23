#!/bin/bash
# filepath: /Users/abe/Documents/VSCode/geo-profile-dashboard/fix-simplemdm-routes.sh

echo "Converting SimpleMDM Next.js dynamic routes to Express routes..."

# Check if the SimpleMDM directory exists
if [ ! -d ./api/simplemdm ]; then
  echo "❌ ./api/simplemdm directory not found!"
  exit 1
fi

# Check if the [...path].js file exists
if [ ! -f ./api/simplemdm/\[\...\path\].js ]; then
  echo "❌ ./api/simplemdm/[...path].js file not found!"
  exit 1
fi

# Create a new simplemdm-proxy.js file with Express-compatible routing
cat > ./api/simplemdm-proxy.js << 'EOF'
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
      
      // Check if user is admin
      const { data: isAdmin, error: adminCheckError } = await supabaseAdmin.rpc('is_admin', {
        user_id: user.id
      })
      
      if (adminCheckError) {
        console.error('Error checking admin status:', adminCheckError)
        return res.status(500).json({ error: 'Server error', message: 'Failed to verify permissions' })
      }
      
      if (!isAdmin) {
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
EOF

# Update server.js to include the new SimpleMDM proxy route
cat >> ./server.js << 'EOF'

// Import SimpleMDM proxy handler
import simpleMdmProxyHandler from './api/simplemdm-proxy.js';

// SimpleMDM API proxy route
app.all('/api/simplemdm/*', async (req, res) => {
  console.log(`SimpleMDM API proxy request: ${req.method} ${req.url}`);
  try {
    // Call the proxy handler
    return await simpleMdmProxyHandler(req, res);
  } catch (error) {
    console.error('Error in SimpleMDM proxy endpoint:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});
EOF

echo "✅ Created Express-compatible SimpleMDM proxy"
echo "✅ Updated server.js with SimpleMDM proxy route"
echo ""
echo "To apply these changes, restart your server with: npm start"
echo "or: node server.js"
