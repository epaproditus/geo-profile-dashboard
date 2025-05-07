// /api/simplemdm/[...path].js
export default async function handler(req, res) {
  try {
    // Get the API key from environment variables - try multiple possible names
    const apiKey = process.env.SIMPLEMDM_API_KEY || process.env.VITE_SIMPLEMDM_API_KEY;
    
    // Debug environment variables and request info
    console.log('Request URL:', req.url);
    console.log('Environment variables check:', !!apiKey);
    console.log('Request query:', req.query);
    
    if (!apiKey) {
      console.error('API Key not found in environment variables');
      return res.status(500).json({ 
        error: 'SimpleMDM API key not configured'
      });
    }
    
    // In Vercel, the path parameter might be handled differently
    // Let's try to extract the path directly from the URL if path query is empty
    let path = '';
    
    if (req.query.path) {
      // If path exists in query (standard Next.js behavior)
      path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    } else {
      // Alternative method: Extract path from URL
      const urlPath = req.url || '';
      const pathMatch = urlPath.match(/\/api\/simplemdm\/(.+?)(?:\?|$)/);
      if (pathMatch && pathMatch[1]) {
        path = pathMatch[1];
      } else {
        // Default to "devices" if we can't extract a path
        path = "devices";
      }
    }
    
    console.log('Extracted path:', path);
    
    // Build the target URL for SimpleMDM API
    const targetUrl = `https://a.simplemdm.com/api/v1/${path}`;
    
    // Create query string
    let queryString = '';
    if (req.url && req.url.includes('?')) {
      queryString = req.url.substring(req.url.indexOf('?'));
    }
    
    const fullUrl = `${targetUrl}${queryString}`;
    console.log(`Proxying request to: ${fullUrl}`);
    
    // Create authorization header with API key
    const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
    
    // Forward the request to SimpleMDM
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined
    });
    
    // Get the response data
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }
    
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