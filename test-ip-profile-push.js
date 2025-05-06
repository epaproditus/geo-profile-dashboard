// This script directly tests pushing a profile to devices with IP address 64.209.154.154
// Usage: node test-ip-profile-push.js

import axios from 'axios';

// Configuration - CHANGE THESE VALUES
const API_KEY = process.env.SIMPLEMDM_API_KEY || ''; // Your SimpleMDM API key
const TARGET_IP = '64.209.154.154';  // The specific IP you're targeting
const PROFILE_ID = '173507';  // DNS-over-https [test] profile

// Set this to false to actually push the profile (true = just test without pushing)
const DRY_RUN = false;

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

// Simple IP matcher (exact match only)
function isIpMatch(deviceIp, targetIp) {
  return deviceIp === targetIp;
}

// Main function
async function testIpProfilePush() {
  try {
    if (!API_KEY) {
      console.error('Error: API_KEY is not set. Please provide your SimpleMDM API key.');
      console.error('You can set it using: export SIMPLEMDM_API_KEY=your_api_key');
      process.exit(1);
    }

    console.log(`Starting IP-based profile push test. Target IP: ${TARGET_IP}`);
    
    // Step 1: Get all devices
    console.log('Fetching all devices...');
    const response = await apiClient.get('/devices');
    const devices = response.data.data;
    
    console.log(`Found ${devices.length} devices total.`);
    
    // Step 2: Find devices with the target IP
    const matchingDevices = devices.filter(device => {
      const deviceIp = device.attributes.last_seen_ip;
      if (!deviceIp) {
        console.log(`Device ${device.id} (${device.attributes.name}) has no IP address.`);
        return false;
      }
      
      const isMatch = isIpMatch(deviceIp, TARGET_IP);
      console.log(`Device ${device.id} (${device.attributes.name}) has IP ${deviceIp}. Match: ${isMatch ? 'YES' : 'NO'}`);
      
      return isMatch;
    });
    
    console.log(`\nFound ${matchingDevices.length} devices with the target IP ${TARGET_IP}.`);
    
    // Step 3: Push the profile to matching devices
    if (matchingDevices.length === 0) {
      console.log('No devices match the target IP. No profiles will be pushed.');
      return;
    }
    
    if (!PROFILE_ID) {
      console.error('\nError: PROFILE_ID is not set. Please specify a profile ID in the script.');
      return;
    }
    
    // Push the profile to each matching device
    console.log('\n==== PROFILE PUSH RESULTS ====');
    for (const device of matchingDevices) {
      console.log(`\nDevice: ${device.id} (${device.attributes.name})`);
      console.log(`IP Address: ${device.attributes.last_seen_ip}`);
      
      if (DRY_RUN) {
        console.log('DRY RUN MODE: Would push profile ' + PROFILE_ID + ' to this device');
        console.log('Set DRY_RUN = false to perform the actual profile push');
      } else {
        try {
          console.log(`Pushing profile ${PROFILE_ID} to device...`);
          const pushResponse = await apiClient.post(`/profiles/${PROFILE_ID}/devices/${device.id}`);
          console.log('SUCCESS! Profile push initiated.');
          console.log('API Response:', pushResponse.data);
        } catch (error) {
          console.error('ERROR pushing profile:');
          if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
          } else {
            console.error(error.message);
          }
        }
      }
    }
    
    console.log('\nProfile push test completed.');
    
  } catch (error) {
    console.error('\nAn error occurred during the test:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

// Run the test
testIpProfilePush();