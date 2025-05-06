// Profile Policy Service - Handles pushing profiles to devices based on IP address

import simplemdmApi from '../api/simplemdm';
import { isIpInRange } from '../utils';
import { getLocationFromIp } from '../utils/ip-geolocation';

// LocalStorage keys
const POLICY_STORAGE_KEY = 'geo-profile-dashboard-policies';
const DEVICE_POLICY_HISTORY_KEY = 'geo-profile-dashboard-device-policy-history';

// Interface for zone policies
interface ZonePolicy {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  locations: {
    displayName: string;
    latitude: number;
    longitude: number;
    radius: number;
    geofenceId: string;
  }[];
  ipRanges?: {
    displayName: string;
    ipAddress: string;
    geofenceId: string;
  }[];
  devices: {
    id: string;
    name: string;
  }[];
  profiles: {
    id: string;
    name: string;
  }[];
}

// Interface to track device policy application history
interface DevicePolicyHistory {
  deviceId: string;
  policyId: string;
  appliedAt: string; // ISO date string
  ipAddress: string | null;
  profileIds: string[]; // IDs of profiles that were pushed
}

/**
 * Profile Policy Service for managing IP-based profile distribution
 */
const profilePolicyService = {
  /**
   * Load policies from localStorage
   */
  loadPolicies(): ZonePolicy[] {
    try {
      const saved = localStorage.getItem(POLICY_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading policies from localStorage:', error);
    }
    return [];
  },

  /**
   * Load device policy history from localStorage
   */
  loadDevicePolicyHistory(): DevicePolicyHistory[] {
    try {
      const saved = localStorage.getItem(DEVICE_POLICY_HISTORY_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading device policy history from localStorage:', error);
    }
    return [];
  },

  /**
   * Save device policy history to localStorage
   */
  saveDevicePolicyHistory(history: DevicePolicyHistory[]): void {
    try {
      localStorage.setItem(DEVICE_POLICY_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving device policy history to localStorage:', error);
    }
  },

  /**
   * Add a policy application event to history
   */
  recordPolicyApplication(deviceId: string, policyId: string, ipAddress: string | null, profileIds: string[]): void {
    const history = this.loadDevicePolicyHistory();
    
    // Add new history entry
    history.push({
      deviceId,
      policyId,
      appliedAt: new Date().toISOString(),
      ipAddress,
      profileIds
    });
    
    // Keep history limited to last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.saveDevicePolicyHistory(history);
  },

  /**
   * Check if a policy was recently applied to a device to avoid duplicates
   * Returns true if the policy was applied in the last hour with the same profiles
   */
  wasPolicyRecentlyApplied(deviceId: string, policyId: string, profileIds: string[]): boolean {
    const history = this.loadDevicePolicyHistory();
    
    // Look for recent applications of this policy to this device
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    return history.some(entry => {
      if (entry.deviceId !== deviceId || entry.policyId !== policyId) {
        return false;
      }
      
      // Check if applied within last hour
      const appliedTime = new Date(entry.appliedAt).getTime();
      if (appliedTime < oneHourAgo) {
        return false;
      }
      
      // Check if same profiles were applied
      const sameProfiles = profileIds.length === entry.profileIds.length &&
        profileIds.every(id => entry.profileIds.includes(id));
      
      return sameProfiles;
    });
  },

  /**
   * Check if device's IP matches any policy's IP ranges
   */
  isDeviceIpInPolicyRange(deviceIp: string | null, policy: ZonePolicy): boolean {
    if (!deviceIp || !policy.ipRanges || policy.ipRanges.length === 0) {
      console.log(`Policy ${policy.name}: No device IP (${deviceIp}) or policy has no IP ranges`);
      return false;
    }
    
    console.log(`Checking if IP ${deviceIp} matches any ranges in policy "${policy.name}"`);
    
    for (const ipRange of policy.ipRanges) {
      if (!ipRange.ipAddress) {
        console.log(`- Range ${ipRange.displayName} has no IP address defined`);
        continue;
      }
      
      console.log(`- Checking range "${ipRange.displayName}": ${ipRange.ipAddress}`);
      const matches = isIpInRange(deviceIp, ipRange.ipAddress);
      console.log(`  Result: ${matches ? 'MATCH ✓' : 'No match'}`);
      
      if (matches) return true;
    }
    
    return false;
  },

  /**
   * Get the appropriate policy for a device based on its IP
   */
  getActivePolicyForDevice(deviceId: string, deviceIp: string | null): ZonePolicy | null {
    const policies = this.loadPolicies();
    console.log(`Checking ${policies.length} policies for device ${deviceId} with IP ${deviceIp || 'unknown'}`);
    
    // REVISED PRIORITY: Check IP matches first, then direct assignments
    
    // First check if IP matches any policy (highest priority)
    if (deviceIp) {
      console.log(`Checking policies for IP match with ${deviceIp}`);
      
      for (const policy of policies) {
        if (policy.isDefault) continue; // Skip default policy for IP check

        console.log(`Checking policy "${policy.name}" (${policy.id})`);
        
        if (this.isDeviceIpInPolicyRange(deviceIp, policy)) {
          console.log(`✅ Found matching policy "${policy.name}" for IP ${deviceIp}`);
          return policy;
        }
      }
      
      console.log(`No IP-based policy match found for ${deviceIp}`);
    }
    
    // Then check if device is directly assigned to a policy (second priority)
    const assignedPolicy = policies.find(p => 
      p.devices.some(d => d.id === deviceId)
    );
    
    if (assignedPolicy) {
      console.log(`Device ${deviceId} is directly assigned to policy "${assignedPolicy.name}"`);
      return assignedPolicy;
    }
    
    // Return default policy as fallback
    const defaultPolicy = policies.find(p => p.isDefault);
    console.log(`Falling back to default policy: "${defaultPolicy?.name || 'None found'}"`);
    return defaultPolicy || null;
  },

  /**
   * Push all profiles from a policy to a device
   * Returns a list of profile IDs that were pushed
   */
  async pushPolicyProfilesToDevice(policy: ZonePolicy, deviceId: string): Promise<string[]> {
    if (!policy.profiles || policy.profiles.length === 0) {
      console.log(`No profiles to push for policy "${policy.name}"`);
      return [];
    }
    
    console.log(`Pushing ${policy.profiles.length} profiles from policy "${policy.name}" to device ${deviceId}`);
    console.log(`Profiles to push: ${policy.profiles.map(p => `"${p.name}" (${p.id})`).join(', ')}`);
    
    const pushedProfileIds: string[] = [];
    
    for (const profile of policy.profiles) {
      try {
        console.log(`Pushing profile "${profile.name}" (ID: ${profile.id}) to device ${deviceId}`);
        
        // First check if profile is already installed
        try {
          const isInstalled = await simplemdmApi.isProfileInstalledOnDevice(profile.id, deviceId);
          if (isInstalled) {
            console.log(`Profile "${profile.name}" is already installed, skipping`);
            pushedProfileIds.push(profile.id);
            continue;
          }
        } catch (checkError) {
          console.error(`Error checking if profile is installed:`, checkError);
          // Continue with push attempt even if check fails
        }
        
        // Push the profile via SimpleMDM API
        await simplemdmApi.pushProfileToDevice(profile.id, deviceId);
        
        pushedProfileIds.push(profile.id);
        console.log(`Profile "${profile.name}" pushed successfully`);
      } catch (error) {
        console.error(`Failed to push profile "${profile.name}":`, error);
      }
    }
    
    return pushedProfileIds;
  },

  /**
   * Process a device that has connected to the network
   * Determines the appropriate policy and pushes/removes profiles if needed
   * Using IP-based detection only, without GPS location
   */
  async processDeviceConnection(deviceId: string, deviceIp: string | null): Promise<{
    policyApplied: boolean;
    policyName: string | null;
    profilesPushed: number;
    profilesRemoved: number;
    removedProfiles: string[];
  }> {
    console.log(`Processing device ${deviceId} connection from IP: ${deviceIp || 'unknown'}`);
    
    // Get the active policy for this device/IP
    const activePolicy = this.getActivePolicyForDevice(deviceId, deviceIp);
    
    if (!activePolicy) {
      console.log(`No applicable policy found for device ${deviceId}`);
      return { 
        policyApplied: false, 
        policyName: null, 
        profilesPushed: 0,
        profilesRemoved: 0,
        removedProfiles: []
      };
    }
    
    console.log(`Determined policy "${activePolicy.name}" for device ${deviceId}`);
    
    // Get last applied policy information
    const lastAppliedPolicy = this.getLastAppliedPolicy(deviceId);
    const oldPolicyId = lastAppliedPolicy ? lastAppliedPolicy.policyId : null;
    
    // Check if we need to handle a policy transition (device moved to a different policy)
    let profilesRemoved = 0;
    let removedProfiles: string[] = [];
    
    if (oldPolicyId && oldPolicyId !== activePolicy.id) {
      console.log(`Device ${deviceId} has changed policies from ${oldPolicyId} to ${activePolicy.id}`);
      console.log(`Cleaning up profiles from previous policy`);
      
      // Handle policy transition - remove profiles from the old policy
      const transitionResult = await this.handlePolicyTransition(
        deviceId, 
        oldPolicyId, 
        activePolicy.id
      );
      
      profilesRemoved = transitionResult.profilesRemoved;
      removedProfiles = transitionResult.removedProfiles;
      
      console.log(`Removed ${profilesRemoved} profiles from previous policy`);
    }
    
    // Get profile IDs from the active policy
    const profileIds = activePolicy.profiles.map(p => p.id);
    
    // Check if this policy was recently applied to avoid duplicate pushes
    // Only skip if no profiles were removed (which would indicate a policy change)
    if (profilesRemoved === 0 && this.wasPolicyRecentlyApplied(deviceId, activePolicy.id, profileIds)) {
      console.log(`Policy "${activePolicy.name}" was recently applied to device ${deviceId}, skipping`);
      return { 
        policyApplied: false, 
        policyName: activePolicy.name, 
        profilesPushed: 0,
        profilesRemoved,
        removedProfiles
      };
    }
    
    // Push the profiles from the policy to the device
    const pushedProfileIds = await this.pushPolicyProfilesToDevice(activePolicy, deviceId);
    
    // Record this policy application in history
    this.recordPolicyApplication(deviceId, activePolicy.id, deviceIp, pushedProfileIds);
    
    return {
      policyApplied: pushedProfileIds.length > 0,
      policyName: activePolicy.name,
      profilesPushed: pushedProfileIds.length,
      profilesRemoved,
      removedProfiles
    };
  },
  
  /**
   * Force apply a specific policy to a device
   * This bypasses all checks and directly applies the policy's profiles
   */
  async forceApplyPolicy(policyId: string, deviceId: string): Promise<{
    success: boolean;
    profilesPushed: number;
    policyName: string | null;
  }> {
    console.log(`Forcing policy ${policyId} to be applied to device ${deviceId}`);
    
    const policies = this.loadPolicies();
    const policy = policies.find(p => p.id === policyId);
    
    if (!policy) {
      console.error(`Policy ${policyId} not found`);
      return { success: false, profilesPushed: 0, policyName: null };
    }
    
    console.log(`Forcing application of policy "${policy.name}" to device ${deviceId}`);
    const pushedProfileIds = await this.pushPolicyProfilesToDevice(policy, deviceId);
    
    // Record this policy application in history
    this.recordPolicyApplication(deviceId, policy.id, null, pushedProfileIds);
    
    return {
      success: pushedProfileIds.length > 0,
      profilesPushed: pushedProfileIds.length,
      policyName: policy.name
    };
  },

  /**
   * Get the last policy that was applied to a device
   */
  getLastAppliedPolicy(deviceId: string): { policyId: string; profileIds: string[] } | null {
    const history = this.loadDevicePolicyHistory();
    
    // Find all entries for this device
    const deviceEntries = history.filter(entry => entry.deviceId === deviceId);
    
    if (deviceEntries.length === 0) {
      console.log(`No policy history found for device ${deviceId}`);
      return null;
    }
    
    // Sort by date (newest first)
    deviceEntries.sort((a, b) => {
      return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
    });
    
    // Return the most recent policy
    return {
      policyId: deviceEntries[0].policyId,
      profileIds: deviceEntries[0].profileIds
    };
  },

  /**
   * Remove profiles from a device that are associated with a specific policy
   */
  async removeProfilesFromDevice(policy: ZonePolicy, deviceId: string): Promise<{
    removed: number;
    failed: number;
    profileNames: string[];
  }> {
    if (!policy.profiles || policy.profiles.length === 0) {
      console.log(`No profiles to remove for policy "${policy.name}"`);
      return { removed: 0, failed: 0, profileNames: [] };
    }
    
    console.log(`Removing ${policy.profiles.length} profiles from policy "${policy.name}" from device ${deviceId}`);
    console.log(`Profiles to remove: ${policy.profiles.map(p => `"${p.name}" (${p.id})`).join(', ')}`);
    
    let removed = 0;
    let failed = 0;
    const removedProfileNames: string[] = [];
    
    for (const profile of policy.profiles) {
      try {
        console.log(`Removing profile "${profile.name}" (ID: ${profile.id}) from device ${deviceId}`);
        
        // First check if profile is actually installed
        try {
          const isInstalled = await simplemdmApi.isProfileInstalledOnDevice(profile.id, deviceId);
          if (!isInstalled) {
            console.log(`Profile "${profile.name}" is not installed, skipping removal`);
            continue;
          }
        } catch (checkError) {
          console.error(`Error checking if profile is installed:`, checkError);
          // Continue with removal attempt even if check fails
        }
        
        // Remove the profile via SimpleMDM API
        await simplemdmApi.removeProfileFromDevice(profile.id, deviceId);
        
        removed++;
        removedProfileNames.push(profile.name);
        console.log(`Profile "${profile.name}" removed successfully`);
      } catch (error) {
        failed++;
        console.error(`Failed to remove profile "${profile.name}":`, error);
      }
    }
    
    return { removed, failed, profileNames: removedProfileNames };
  },

  /**
   * Handle device policy transition - removes old policy profiles if needed
   */
  async handlePolicyTransition(deviceId: string, oldPolicyId: string | null, newPolicyId: string): Promise<{
    profilesRemoved: number;
    removedProfiles: string[];
  }> {
    // If no policy change, no need to remove profiles
    if (oldPolicyId === newPolicyId) {
      return { profilesRemoved: 0, removedProfiles: [] };
    }
    
    // Get the old policy
    const policies = this.loadPolicies();
    const oldPolicy = oldPolicyId ? policies.find(p => p.id === oldPolicyId) : null;
    
    if (!oldPolicy) {
      console.log(`No previous policy to clean up for device ${deviceId}`);
      return { profilesRemoved: 0, removedProfiles: [] };
    }
    
    // Remove profiles from the old policy
    console.log(`Cleaning up profiles from previous policy "${oldPolicy.name}" for device ${deviceId}`);
    const removalResult = await this.removeProfilesFromDevice(oldPolicy, deviceId);
    
    return { 
      profilesRemoved: removalResult.removed,
      removedProfiles: removalResult.profileNames
    };
  },
};

export default profilePolicyService;