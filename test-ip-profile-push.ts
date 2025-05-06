// Test script for IP-based profile pushing
// This runs with Node.js and demonstrates profile pushing based on IP matching

// Import required dependencies
// Using require syntax for better compatibility with different Node.js setups
const path = require('path');

// Mock simplemdmApi for testing
const simplemdmApi = {
  pushProfileToDevice: async (profileId, deviceId) => {
    console.log(`[API CALL] Pushing profile ${profileId} to device ${deviceId}`);
    return { success: true };
  }
};

// Mock IP geolocation function
const getLocationFromIp = (ipAddress) => {
  if (!ipAddress) return null;
  
  // Simple mock database for testing
  const mockLocations = {
    "192.168.1.1": { 
      latitude: 26.298837, 
      longitude: -97.983829,
      name: "Main Office", 
      accuracy: 100
    },
    "10.0.0.1": { 
      latitude: 26.298482, 
      longitude: -98.177070,
      name: "Branch Office", 
      accuracy: 100
    }
  };
  
  return mockLocations[ipAddress] || {
    latitude: 26.298837 + (Math.random() * 0.01 - 0.005),
    longitude: -97.983829 + (Math.random() * 0.01 - 0.005),
    name: `Network Location (${ipAddress})`,
    accuracy: 1000
  };
};

// Mock IP range check
const isIpInRange = (deviceIp, ipRange) => {
  // For this test, we'll do a simple equality check
  return deviceIp === ipRange;
};

// Mock storage for the ZonePolicy data
const POLICIES = [
  {
    id: "office-policy",
    name: "Office Policy",
    description: "Policy for devices in the office",
    isDefault: false,
    locations: [],
    ipRanges: [
      {
        displayName: "Office WiFi",
        ipAddress: "192.168.1.1", // Sample office IP address
        geofenceId: "office-ip-1"
      }
    ],
    devices: [],
    profiles: [
      {
        id: "1", // SimpleMDM profile ID
        name: "Office Security Profile"
      },
      {
        id: "2", // SimpleMDM profile ID
        name: "Office WiFi Configuration"
      }
    ]
  },
  {
    id: "default-policy",
    name: "Default Policy",
    description: "Default policy when no other matches",
    isDefault: true,
    locations: [],
    devices: [],
    profiles: [
      {
        id: "3", // SimpleMDM profile ID
        name: "Basic Security Profile"
      }
    ]
  }
];

// Function to check if a device's IP matches a policy's IP ranges
function isDeviceIpInPolicyRange(deviceIp, policy) {
  if (!deviceIp || !policy.ipRanges || policy.ipRanges.length === 0) return false;
  
  return policy.ipRanges.some(ipRange => {
    if (!ipRange.ipAddress) return false;
    return isIpInRange(deviceIp, ipRange.ipAddress);
  });
}

// Function to get the active policy for a device based on its IP
function getActivePolicyForDevice(deviceIp, policies) {
  // First check if device IP matches any policy's IP addresses
  if (deviceIp) {
    const ipBasedPolicies = policies.filter(p => 
      !p.isDefault && isDeviceIpInPolicyRange(deviceIp, p)
    );
    
    if (ipBasedPolicies.length > 0) {
      // Return the first matching IP-based policy
      return ipBasedPolicies[0];
    }
  }
  
  // If no match is found, return the default policy
  return policies.find(p => p.isDefault);
}

// Function to push profiles to device based on policy
async function pushPolicyProfilesToDevice(policy, deviceId) {
  console.log(`Applying policy "${policy.name}" to device ${deviceId}`);
  
  if (!policy.profiles || policy.profiles.length === 0) {
    console.log(`No profiles to push for policy "${policy.name}"`);
    return;
  }
  
  console.log(`Pushing ${policy.profiles.length} profiles to device ${deviceId}:`);
  
  for (const profile of policy.profiles) {
    try {
      console.log(`  - Pushing profile "${profile.name}" (ID: ${profile.id}) to device ${deviceId}...`);
      
      // In test mode, we'll just log this action
      console.log(`    [TEST MODE] Would make API call: POST /profiles/${profile.id}/devices/${deviceId}`);
      
      // Comment this line to just simulate, uncomment to make real API calls (if implemented)
      // await simplemdmApi.pushProfileToDevice(profile.id, deviceId);
      
      console.log(`    Profile "${profile.name}" pushed successfully.`);
    } catch (error) {
      console.error(`    ERROR: Failed to push profile "${profile.name}":`, error);
    }
  }
  
  console.log(`All profiles for policy "${policy.name}" have been processed.`);
}

// Main function to simulate a device connecting with a specific IP
async function simulateDeviceConnection(deviceId, ipAddress) {
  console.log(`\n==== DEVICE CONNECTION SIMULATION ====`);
  console.log(`Device ${deviceId} connected from IP: ${ipAddress}`);
  
  // Get location from IP (for displaying on map)
  const location = getLocationFromIp(ipAddress);
  if (location) {
    console.log(`IP location detected: ${location.name} (${location.latitude}, ${location.longitude})`);
  } else {
    console.log(`No location info available for IP ${ipAddress}`);
  }
  
  // Determine which policy should apply
  const activePolicy = getActivePolicyForDevice(ipAddress, POLICIES);
  
  if (!activePolicy) {
    console.log(`No applicable policy found for device ${deviceId} at IP ${ipAddress}`);
    return;
  }
  
  // Push the profiles from the active policy to the device
  await pushPolicyProfilesToDevice(activePolicy, deviceId);
}

// Run the test with example devices and IPs
async function runTest() {
  console.log("=== STARTING IP-BASED PROFILE PUSH TEST ===\n");
  
  // Test case 1: Device connects from office IP
  await simulateDeviceConnection("12345", "192.168.1.1");
  
  // Test case 2: Device connects from non-matching IP (should use default policy)
  await simulateDeviceConnection("54321", "10.0.0.5");
  
  console.log("\n=== TEST COMPLETED ===");
}

// Run the test
runTest()
  .catch(error => {
    console.error("Test failed with error:", error);
    process.exit(1);
  });