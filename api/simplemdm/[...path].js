// /api/simplemdm/[...path].js
export default async function handler(req, res) {
  try {
    // Get the API key from environment variables - try multiple possible names
    const apiKey = process.env.SIMPLEMDM_API_KEY || process.env.VITE_SIMPLEMDM_API_KEY;
    
    // Debug environment variables
    console.log('Environment variables check:');
    console.log('- API Key exists:', !!apiKey);
    console.log('- API Key length:', apiKey ? apiKey.length : 0);
    
    if (!apiKey) {
      console.error('API Key not found in environment variables');
      return res.status(500).json({ 
        error: 'SimpleMDM API key not configured',
        message: 'Please set the SIMPLEMDM_API_KEY environment variable in Vercel'
      });
    }
    
    // Extract path parameters (everything after /api/simplemdm/)
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({ error: 'No path specified' });
    }
    
    // Build the target URL for SimpleMDM API
    const targetUrl = `https://a.simplemdm.com/api/v1/${Array.isArray(path) ? path.join('/') : path}`;
    
    // Get request body for non-GET requests
    let body = undefined;
    if (req.method !== 'GET' && req.body) {
      body = JSON.stringify(req.body);
    }
    
    // Add query parameters if present
    let queryString = '';
    try {
      queryString = new URL(req.url, 'http://localhost').search;
    } catch (err) {
      console.warn('Error parsing URL:', err.message);
    }
    
    const fullUrl = targetUrl + queryString;
    
    console.log(`Proxying ${req.method} request to: ${fullUrl}`);
    
    // Create authorization header with API key
    const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
    
    // Forward the request to SimpleMDM
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: body
    });
    
    // Check if response is ok
    if (!response.ok) {
      console.error(`SimpleMDM API returned error ${response.status}: ${response.statusText}`);
      
      // Try to get error details from response
      let errorText;
      try {
        const errorData = await response.text();
        errorText = errorData;
      } catch (e) {
        errorText = 'Could not parse error response';
      }
      
      return res.status(response.status).json({
        error: `SimpleMDM API error: ${response.statusText}`,
        details: errorText,
        status: response.status
      });
    }
    
    // Get the response data
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }
    
    // Return the response to the client
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('API Proxy Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch from SimpleMDM API',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}