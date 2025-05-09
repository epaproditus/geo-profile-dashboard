import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import handler from './api/schedules/execute.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// API endpoint for schedule execution
app.all('/api/schedules/execute', async (req, res) => {
  // Wrap the serverless function for Express
  return await handler(req, res);
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
});
