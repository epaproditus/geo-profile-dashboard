import { simplemdmApi } from '@/lib/api/simplemdm';
import { useToast } from "@/hooks/use-toast";
import { usePushProfileToDevice } from '@/hooks/use-simplemdm';
import { isIpInRange } from '@/lib/utils'; // Import the improved isIpInRange function

// Type definitions
interface Location {
  latitude: number;
  longitude: number;
  radius: number; // in meters
  displayName?: string;
  geofenceId?: string;
}

interface Device {
  id: string | number;
  name?: string;
  attributes?: {
    location_latitude?: string | null;
    location_longitude?: string | null;
    location_updated_at?: string | null;
    ip_address?: string | null; // Added IP address to device attributes
  };
  latitude?: number;
  longitude?: number;
  ip_address?: string; // Added as a top-level property too for flexibility
}

interface Policy {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  locations: Location[];
  ipRanges?: { // Added IP ranges to policy type
    displayName: string;
    ipAddress: string;  // Can be single IP or CIDR notation
    geofenceId: string;
  }[];
  devices: { id: string; name?: string }[];
  profiles: { id: string; name?: string }[];
}

// Store policies for use across the service
let currentPolicies: Policy[] = [];

// Store local timestamps for device location updates
const deviceLocationTimestamps: Record<string, number> = {};

// Track which profiles are applied to which devices and by which policy
// This helps us know which profiles to remove when a device's policy changes
interface AppliedProfileRecord {
  profileId: string;
  policyId: string;
  appliedAt: number; // timestamp
}

const deviceProfilesMap: Record<string, AppliedProfileRecord[]> = {};

// Calculate distance between two points in meters using Haversine formula
const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180; // Fixed: was using lon1 twice

  const a = 
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Check if a device is within a policy location
// This is only used for dashboard display purposes now
const isDeviceInLocation = (
  deviceLat: number,
  deviceLng: number,
  location: Location
): boolean => {
  const distance = calculateDistance(
    deviceLat,
    deviceLng,
    location.latitude,
    location.longitude
  );

  return distance <= location.radius;
};

// Check if device IP is within a policy's IP ranges
// This is the primary method for determining policy application
const isDeviceIpInPolicyRange = (
  deviceIp: string | null | undefined,
  policy: Policy
): boolean => {
  if (!deviceIp || !policy.ipRanges || policy.ipRanges.length === 0) {
    return false;
  }
  
  console.log(`Checking if IP ${deviceIp} is within policy ${policy.name} IP ranges`);
  
  return policy.ipRanges.some(ipRange => {
    if (!ipRange.ipAddress) return false;
    
    const matches = isIpInRange(deviceIp, ipRange.ipAddress);
    console.log(`- Checking against ${ipRange.ipAddress}: ${matches ? 'MATCH' : 'No match'}`);
    
    return matches;
  });
};

// Check if device location is fresh (less than 10 minutes old)
// Only used for display purposes on the dashboard
const isLocationFresh = (
  deviceId: string | number,
  locationUpdatedAt: string | null | undefined
): boolean => {
  // First check our local timestamps
  const localTimestamp = deviceLocationTimestamps[String(deviceId)];
  if (localTimestamp) {
    const timeSinceLocalUpdate = new Date().getTime() - localTimestamp;
    const tenMinutesInMs = 10 * 60 * 1000;
    
    if (timeSinceLocalUpdate < tenMinutesInMs) {
      console.log(`Device ${deviceId} location is fresh (updated ${Math.round(timeSinceLocalUpdate / 1000)} seconds ago locally)`);
      return true;
    }
  }

  // Fall back to SimpleMDM timestamp if provided
  if (locationUpdatedAt) {
    const deviceUpdateTime = new Date(locationUpdatedAt).getTime();
    const now = new Date().getTime();
    const timeSinceDeviceUpdate = now - deviceUpdateTime;
    const tenMinutesInMs = 10 * 60 * 1000;

    if (timeSinceDeviceUpdate < tenMinutesInMs) {
      console.log(`Device ${deviceId} location is fresh (reported ${Math.round(timeSinceDeviceUpdate / 1000)} seconds ago by SimpleMDM)`);
      return true;
    }
  }

  console.log(`Device ${deviceId} location is stale (older than 10 minutes)`);
  return false;
};

// Update our local timestamp when we refresh a device's location
const updateDeviceLocationTimestamp = (deviceId: string | number): void => {
  deviceLocationTimestamps[String(deviceId)] = new Date().getTime();
  console.log(`Updated location timestamp for device ${deviceId}`);
};

// Find all policies that apply to a device - IMPORTANT: no longer uses device location for policy decisions
export const findApplicablePolicies = (
  deviceId: string,
  deviceIp: string | null | undefined,
  allPolicies: Policy[]
): Policy[] => {
  // First check direct device assignments (highest priority)
  const deviceAssignedPolicies = allPolicies.filter(policy => 
    !policy.isDefault && policy.devices.some(d => d.id === deviceId)
  );
  
  if (deviceAssignedPolicies.length > 0) {
    console.log(`Device ${deviceId} is directly assigned to ${deviceAssignedPolicies.length} policies`);
    return deviceAssignedPolicies;
  }
  
  // Next, check IP address matches (second priority)
  if (deviceIp) {
    const ipMatchedPolicies = allPolicies.filter(policy => 
      !policy.isDefault && isDeviceIpInPolicyRange(deviceIp, policy)
    );
    
    if (ipMatchedPolicies.length > 0) {
      console.log(`Device ${deviceId} with IP ${deviceIp} matches ${ipMatchedPolicies.length} policies`);
      return ipMatchedPolicies;
    }
  }
  
  // If no specific match, use default policies
  const defaultPolicies = allPolicies.filter(p => p.isDefault);
  console.log(`No specific policies matched for device ${deviceId}, using ${defaultPolicies.length} default policies`);
  return defaultPolicies;
};

// Apply profiles from policies to a device
export const applyProfilesToDevice = async (
  device: Device,
  policies: Policy[]
): Promise<void> => {
  // Get the device IP - this is now the primary method for policy matching
  const deviceIp = device.attributes?.ip_address || device.ip_address;
  
  // Get device ID
  const deviceId = String(device.id);
  
  // Find applicable policies prioritizing IP matching
  const applicablePolicies = findApplicablePolicies(deviceId, deviceIp, policies);
  
  if (applicablePolicies.length === 0) {
    console.log(`No applicable policies found for device ${deviceId}`);
    return;
  }
  
  // Log policy match reason for debugging
  if (applicablePolicies.some(p => p.devices.some(d => d.id === deviceId))) {
    console.log(`Policy applied based on direct device assignment`);
  } else if (deviceIp && applicablePolicies.some(p => !p.isDefault)) {
    console.log(`Policy applied based on IP address match: ${deviceIp}`);
  } else {
    console.log(`Policy applied based on default fallback`);
  }

  // Get all profiles from applicable policies
  const profilesToApply = applicablePolicies.flatMap(p => p.profiles);
  
  if (profilesToApply.length === 0) {
    console.log(`No profiles to apply for device ${deviceId}`);
    return;
  }
  
  console.log(`Applying ${profilesToApply.length} profiles from ${applicablePolicies.length} policies to device ${deviceId}`);

  // Apply each profile to the device
  for (const profile of profilesToApply) {
    try {
      console.log(`Applying profile ${profile.id} to device ${deviceId}`);
      await simplemdmApi.pushProfileToDevice(profile.id, deviceId);
      
      // Record this profile application
      recordProfileApplication(deviceId, String(profile.id), applicablePolicies[0].id);
    } catch (error) {
      console.error(`Failed to apply profile ${profile.id} to device ${deviceId}:`, error);
    }
  }
};

// Use the location service to check and apply profiles
export const checkAndApplyProfilesForDevice = async (
  device: Device,
  allPolicies: Policy[]
): Promise<void> => {
  try {
    await applyProfilesToDevice(device, allPolicies);
  } catch (error) {
    console.error(`Error applying profiles to device ${device.id}:`, error);
  }
};

// Set the current policies for the service to use
const setPolicies = (policies: Policy[]): void => {
  currentPolicies = policies;
  console.log(`Set ${policies.length} policies for location-profile service`);
};

// Handle a device location update and apply profiles if needed
const handleDeviceLocationUpdate = async (device: Device): Promise<void> => {
  if (!device) {
    console.log(`No device provided, skipping profile application`);
    return;
  }
  
  if (currentPolicies.length === 0) {
    console.log('No policies set, skipping profile application');
    return;
  }

  try {
    // Update our local timestamp for this device
    updateDeviceLocationTimestamp(device.id);
    
    // Call applyProfilesToDevice with all necessary information
    await applyProfilesToDevice(device, currentPolicies);
  } catch (error) {
    console.error(`Error handling device location update:`, error);
  }
};

// Process a device connection with IP address
// This is the primary method for applying profiles based on IP address
const processDeviceConnection = async (
  deviceId: string,
  ipAddress: string
): Promise<{ 
  policyApplied: boolean, 
  policyName: string, 
  profilesPushed: number,
  profilesRemoved?: number  // New field to track removed profiles
}> => {
  if (currentPolicies.length === 0) {
    console.log('No policies set, skipping profile application');
    return { policyApplied: false, policyName: "", profilesPushed: 0 };
  }
  
  try {
    console.log(`Processing connection for device ${deviceId} with IP ${ipAddress}`);
    
    // Find policies that match this device directly
    const directAssignedPolicies = currentPolicies.filter(policy => 
      !policy.isDefault && policy.devices.some(d => d.id === deviceId)
    );
    
    // Find policies that match by IP address
    const ipMatchingPolicies = currentPolicies.filter(policy => 
      !policy.isDefault && isDeviceIpInPolicyRange(ipAddress, policy)
    );
    
    let activePolicy;
    let matchReason = "";
    
    // Prioritize direct device assignment
    if (directAssignedPolicies.length > 0) {
      activePolicy = directAssignedPolicies[0];
      matchReason = "direct device assignment";
    }
    // Then try IP-based matching
    else if (ipMatchingPolicies.length > 0) {
      activePolicy = ipMatchingPolicies[0];
      matchReason = "IP address match";
    }
    // Fallback to default policy
    else {
      activePolicy = currentPolicies.find(p => p.isDefault);
      matchReason = "default fallback";
    }
    
    if (!activePolicy) {
      console.log(`No applicable policy found for device ${deviceId}`);
      return { policyApplied: false, policyName: "", profilesPushed: 0 };
    }
    
    console.log(`Selected policy "${activePolicy.name}" for device ${deviceId} based on ${matchReason}`);
    
    // NEW CODE: Handle profile cleanup
    // Check for profiles that were applied by other policies (not the active one)
    // and remove them since they no longer apply
    const profilesRemoved = await removeOutdatedProfiles(deviceId, activePolicy.id);
    
    // Get profiles from the active policy
    const profilesToApply = activePolicy.profiles;
    
    if (profilesToApply.length === 0) {
      console.log(`No profiles to apply for device ${deviceId} from policy ${activePolicy.name}`);
      return { 
        policyApplied: true, 
        policyName: activePolicy.name, 
        profilesPushed: 0,
        profilesRemoved 
      };
    }
    
    // Apply each profile
    let profilesApplied = 0;
    for (const profile of profilesToApply) {
      try {
        console.log(`Applying profile ${profile.id} (${profile.name}) to device ${deviceId} from policy ${activePolicy.name}`);
        await simplemdmApi.pushProfileToDevice(profile.id, deviceId);
        profilesApplied++;
        
        // Record this profile application
        recordProfileApplication(deviceId, String(profile.id), activePolicy.id);
      } catch (error) {
        console.error(`Failed to apply profile ${profile.id} to device ${deviceId}:`, error);
      }
    }
    
    console.log(`Successfully applied ${profilesApplied} profiles to device ${deviceId}`);
    
    return { 
      policyApplied: true, 
      policyName: activePolicy.name, 
      profilesPushed: profilesApplied,
      profilesRemoved
    };
  } catch (error) {
    console.error(`Error processing device connection:`, error);
    return { policyApplied: false, policyName: "", profilesPushed: 0 };
  }
};

// NEW FUNCTION: Record when a profile is applied to a device
const recordProfileApplication = (deviceId: string, profileId: string, policyId: string): void => {
  // Initialize the device's profile array if it doesn't exist
  if (!deviceProfilesMap[deviceId]) {
    deviceProfilesMap[deviceId] = [];
  }
  
  // Check if this profile is already recorded
  const existingRecord = deviceProfilesMap[deviceId].find(record => 
    record.profileId === profileId && record.policyId === policyId
  );
  
  if (existingRecord) {
    // Update the timestamp
    existingRecord.appliedAt = Date.now();
  } else {
    // Add a new record
    deviceProfilesMap[deviceId].push({
      profileId,
      policyId,
      appliedAt: Date.now()
    });
  }
  
  console.log(`Recorded profile ${profileId} application to device ${deviceId} by policy ${policyId}`);
};

// NEW FUNCTION: Remove profiles that were applied by different policies
const removeOutdatedProfiles = async (deviceId: string, currentPolicyId: string): Promise<number> => {
  // If we don't have any record for this device, there's nothing to remove
  if (!deviceProfilesMap[deviceId]) {
    return 0;
  }
  
  // Find profiles that were applied by other policies
  const outdatedProfiles = deviceProfilesMap[deviceId].filter(record => 
    record.policyId !== currentPolicyId
  );
  
  if (outdatedProfiles.length === 0) {
    console.log(`No outdated profiles to remove from device ${deviceId}`);
    return 0;
  }
  
  console.log(`Found ${outdatedProfiles.length} outdated profiles to remove from device ${deviceId}`);
  
  // Remove each outdated profile
  let removedCount = 0;
  for (const record of outdatedProfiles) {
    try {
      console.log(`Removing profile ${record.profileId} from device ${deviceId} (applied by policy ${record.policyId})`);
      await simplemdmApi.removeProfileFromDevice(record.profileId, deviceId);
      removedCount++;
      
      // Remove this record from the device's profile array
      deviceProfilesMap[deviceId] = deviceProfilesMap[deviceId].filter(r => 
        !(r.profileId === record.profileId && r.policyId === record.policyId)
      );
    } catch (error) {
      console.error(`Failed to remove profile ${record.profileId} from device ${deviceId}:`, error);
    }
  }
  
  console.log(`Successfully removed ${removedCount} outdated profiles from device ${deviceId}`);
  return removedCount;
};

export default {
  calculateDistance,
  isDeviceInLocation,
  isDeviceIpInPolicyRange,
  findApplicablePolicies,
  applyProfilesToDevice,
  checkAndApplyProfilesForDevice,
  setPolicies,
  handleDeviceLocationUpdate,
  updateDeviceLocationTimestamp,
  processDeviceConnection
};