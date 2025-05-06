// This script lists all available profiles in your SimpleMDM account
// Usage: node list-profiles.js

import axios from 'axios';

// Configuration
const API_KEY = process.env.SIMPLEMDM_API_KEY || ''; // Your SimpleMDM API key

// API client setup
const apiClient = axios.create({
  baseURL: 'https://a.simplemdm.com/api/v1',
  auth: {
    username: API_KEY,
    password: ''
  },
  headers: {
    'Content-Type': 'application/json'
  }
});

// Main function
async function listProfiles() {
  try {
    if (!API_KEY) {
      console.error('Error: API_KEY is not set. Please provide your SimpleMDM API key.');
      console.error('You can set it using: export SIMPLEMDM_API_KEY=your_api_key');
      process.exit(1);
    }

    console.log('Fetching all profiles from SimpleMDM...');
    
    const response = await apiClient.get('/profiles');
    const profiles = response.data.data;
    
    console.log(`\nFound ${profiles.length} profiles:\n`);
    
    // List all profiles with their IDs
    profiles.forEach(profile => {
      console.log(`ID: ${profile.id}`);
      console.log(`Name: ${profile.attributes.name}`);
      console.log(`Type: ${profile.attributes.profile_type}`);
      console.log(`Created: ${profile.attributes.created_at}`);
      console.log(`Updated: ${profile.attributes.updated_at}`);
      console.log('-'.repeat(40));
    });
    
  } catch (error) {
    console.error('\nAn error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Run the function
listProfiles();