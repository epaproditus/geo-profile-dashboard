// This script directly tests pushing a profile to a device with a specific IP address
import { simplemdmApi } from './src/lib/api/simplemdm';
import { isIpInRange } from './src/lib/utils';

// Configuration
const TARGET_IP = '64.209.154.154';  // The specific IP you're targeting
const PROFILE_ID = ''; // TODO: Add your profile ID here 
const LOG_DETAILS = true;  // Set to true for detailed logging

// Main function to run the test
async function testProfilePush() {
  try {
    console.log(`Starting IP-based profile push test. Target IP: ${TARGET_IP}`);
    
    // Step 1: Get all devices
    console.log('Fetching all devices...');
    const devices = await simplemdmApi.getDevices({ limit: 100 });
    
    if (!devices.data || devices.data.length === 0) {
      console.error('No devices found in your SimpleMDM account.');
      return;
    }
    
    console.log(`Found ${devices.data.length} devices.`);
    
    // Step 2: Find devices with the target IP
    const matchingDevices = devices.data.filter(device => {
      const deviceIp = device.attributes.last_seen_ip;
      if (!deviceIp) {
        if (LOG_DETAILS) console.log(`Device ${device.id} (${device.attributes.name}) has no IP address.`);
        return false;
      }
      
      const isMatch = isIpInRange(deviceIp, TARGET_IP);
      if (LOG_DETAILS) {
        console.log(`Device ${device.id} (${device.attributes.name}) has IP ${deviceIp}. Match: ${isMatch ? 'YES' : 'NO'}`);
      }
      
      return isMatch;
    });
    
    console.log(`Found ${matchingDevices.length} devices with the target IP.`);
    
    // Step 3: Push the profile to matching devices
    if (matchingDevices.length === 0) {
      console.log('No devices match the target IP. No profiles will be pushed.');
      return;
    }
    
    if (!PROFILE_ID) {
      console.error('PROFILE_ID is not set. Please specify a profile ID.');
      return;
    }
    
    // Push the profile to each matching device
    for (const device of matchingDevices) {
      console.log(`Pushing profile ${PROFILE_ID} to device ${device.id} (${device.attributes.name})...`);
      
      try {
        const result = await simplemdmApi.pushProfileToDevice(PROFILE_ID, device.id);
        console.log(`Successfully pushed profile to device ${device.id}. Result:`, result);
      } catch (error) {
        console.error(`Failed to push profile to device ${device.id}:`, error);
      }
    }
    
    console.log('Profile push test completed.');
    
  } catch (error) {
    console.error('An error occurred during the test:', error);
  }
}

// Run the test
testProfilePush();