import { simplemdmApi } from '@/lib/api/simplemdm';
import { useToast } from "@/hooks/use-toast";
import { usePushProfileToDevice } from '@/hooks/use-simplemdm';

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
  };
  latitude?: number;
  longitude?: number;
}

interface Profile {
  id: string | number;
  name?: string;
}

interface Policy {
  id: string;
  name: string;
  locations: Location[];
  devices: { id: string; name: string }[];
  profiles: { id: string; name: string }[];
  isDefault: boolean;
}

// Store policies for use across the service
let currentPolicies: Policy[] = [];

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
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = 
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Check if a device is within a policy location
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

// Find all policies that apply to a device at its current location
export const findApplicablePolicies = (
  deviceId: string,
  deviceLat: number,
  deviceLng: number,
  allPolicies: Policy[]
): Policy[] => {
  // First check if this device is in any policy's locations
  const applicablePolicies = allPolicies.filter(policy => {
    // Skip if device is not in this policy's devices list
    if (policy.devices.length > 0 && !policy.devices.some(d => d.id === deviceId)) {
      return false;
    }

    // For non-default policies, check if device is in any of the policy's locations
    if (!policy.isDefault) {
      return policy.locations.some(location => 
        isDeviceInLocation(deviceLat, deviceLng, location)
      );
    }

    // Default policies are only applied if no other policy applies
    return policy.isDefault;
  });

  // If we found applicable non-default policies, filter out the default ones
  const nonDefaultPolicies = applicablePolicies.filter(p => !p.isDefault);
  
  if (nonDefaultPolicies.length > 0) {
    return nonDefaultPolicies;
  }

  // If no specific policy applies, return default policies
  return applicablePolicies.filter(p => p.isDefault);
};

// Apply profiles from policies to a device
export const applyProfilesToDevice = async (
  device: Device,
  policies: Policy[]
): Promise<void> => {
  // Skip if the device has no location data
  if (
    !device.attributes?.location_latitude || 
    !device.attributes?.location_longitude
  ) {
    console.log(`Device ${device.id} has no location data, skipping profile application`);
    return;
  }

  const deviceLat = parseFloat(device.attributes.location_latitude);
  const deviceLng = parseFloat(device.attributes.location_longitude);

  if (isNaN(deviceLat) || isNaN(deviceLng)) {
    console.log(`Device ${device.id} has invalid location data, skipping profile application`);
    return;
  }

  // Find applicable policies
  const applicablePolicies = findApplicablePolicies(
    String(device.id),
    deviceLat,
    deviceLng,
    policies
  );

  if (applicablePolicies.length === 0) {
    console.log(`No applicable policies found for device ${device.id}`);
    return;
  }

  // Get all profiles from applicable policies
  const profilesToApply = applicablePolicies.flatMap(p => p.profiles);

  // Apply each profile to the device
  for (const profile of profilesToApply) {
    try {
      console.log(`Applying profile ${profile.id} to device ${device.id}`);
      await simplemdmApi.pushProfileToDevice(profile.id, device.id);
    } catch (error) {
      console.error(`Failed to apply profile ${profile.id} to device ${device.id}:`, error);
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
  if (!device || !device.latitude || !device.longitude) {
    console.log(`Device has no location data, skipping profile application`);
    return;
  }

  if (currentPolicies.length === 0) {
    console.log('No policies set, skipping profile application');
    return;
  }

  try {
    // Find applicable policies
    const applicablePolicies = findApplicablePolicies(
      String(device.id),
      device.latitude,
      device.longitude,
      currentPolicies
    );

    if (applicablePolicies.length === 0) {
      console.log(`No applicable policies found for device ${device.id}`);
      return;
    }

    // Get all profiles from applicable policies
    const profilesToApply = applicablePolicies.flatMap(p => p.profiles);

    if (profilesToApply.length === 0) {
      console.log(`No profiles to apply for device ${device.id}`);
      return;
    }

    // Apply each profile to the device
    for (const profile of profilesToApply) {
      try {
        console.log(`Applying profile ${profile.id} to device ${device.id}`);
        await simplemdmApi.pushProfileToDevice(profile.id, device.id);
      } catch (error) {
        console.error(`Failed to apply profile ${profile.id} to device ${device.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error handling device location update:`, error);
  }
};

export default {
  calculateDistance,
  isDeviceInLocation,
  findApplicablePolicies,
  applyProfilesToDevice,
  checkAndApplyProfilesForDevice,
  setPolicies,
  handleDeviceLocationUpdate
};