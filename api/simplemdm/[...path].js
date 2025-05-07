// /api/simplemdm/[...path].js
export default async function handler(req, res) {
  try {
    // Get the API key from environment variables
    const apiKey = process.env.VITE_SIMPLEMDM_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'SimpleMDM API key not configured' });
    }
    
    // Extract path parameters (everything after /api/simplemdm/)
    const { path } = req.query;
    
    // Build the target URL for SimpleMDM API
    const targetUrl = `https://a.simplemdm.com/api/v1/${Array.isArray(path) ? path.join('/') : path}`;
    
    // Get request body for non-GET requests
    let body = undefined;
    if (req.method !== 'GET' && req.body) {
      body = JSON.stringify(req.body);
    }
    
    // Add query parameters if present
    const queryString = new URL(req.url, 'http://localhost').search;
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
    
    // Get the response data
    const data = await response.json();
    
    // Return the response to the client
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('API Proxy Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch from SimpleMDM API',
      details: error.message 
    });
  }
}