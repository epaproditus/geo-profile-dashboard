import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import handler from './api/schedules/execute.js';

// Load environment variables
dotenv.config();

// Log environment variable status
console.log('Environment variables:');
console.log('- VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Set' : 'Not set');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API endpoint for schedule execution
app.all('/api/schedules/execute', async (req, res) => {
  // Wrap the serverless function for Express
  return await handler(req, res);
});

// Import the admin status handler
import setAdminStatusHandler from './api/auth/set-admin-status.js';
import quickProfilesHandler from './api/quick-profiles.js';

// API endpoint for setting admin status
app.all('/api/auth/set-admin-status', async (req, res) => {
  console.log('Admin status API called with:', { 
    method: req.method, 
    body: req.body,
    query: req.query
  });
  try {
    // Wrap the serverless function for Express
    return await setAdminStatusHandler(req, res);
  } catch (error) {
    console.error('Error in admin status endpoint:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// API endpoint for quick profiles
app.all('/api/quick-profiles', async (req, res) => {
  console.log('Quick profiles API called with:', { 
    method: req.method, 
    body: req.body,
    query: req.query
  });
  try {
    // Wrap the serverless function for Express
    return await quickProfilesHandler(req, res);
  } catch (error) {
    console.error('Error in quick profiles endpoint:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

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

// Serve static files from the build directory
app.use(express.static(join(__dirname, 'dist')));

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`- Admin API endpoint: http://localhost:${PORT}/api/auth/set-admin-status`);
  console.log(`- Schedules API endpoint: http://localhost:${PORT}/api/schedules/execute`);
  console.log(`- SimpleMDM API proxy: http://localhost:${PORT}/api/simplemdm/*`);
  
  console.log('\nFor troubleshooting information, see:');
  console.log('- ADMIN_API.md');
  console.log('- ADMIN_API_TROUBLESHOOTING.md');
});

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
