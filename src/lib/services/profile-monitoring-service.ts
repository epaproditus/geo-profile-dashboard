import { simplemdmApi } from '@/lib/api/simplemdm';
import { isIpInRange } from '@/lib/utils';

// Configuration
const TARGET_IP = '64.209.154.154';  // The specific IP you're targeting
const DEBUG_MODE = true;  // Enable detailed logging

// Type definitions
interface Device {
  id: string | number;
  attributes?: {
    name?: string;
    last_seen_ip?: string | null;
  };
}

interface Profile {
  id: string | number;
  name?: string;
}

interface Policy {
  id: string;
  name: string;
  profiles: Profile[];
  ipRanges?: {
    ipAddress: string;
    displayName: string;
  }[];
}

// Store for monitoring service
const monitoringState = {
  isRunning: false,
  knownDeviceIPs: new Map<string, string>(),
  policies: [] as Policy[],
  logHistory: [] as string[]
};

// Initialize the monitoring service
const initialize = (policies: Policy[]) => {
  monitoringState.policies = policies;
  if (DEBUG_MODE) {
    addToLog('Profile monitoring service initialized with ' + policies.length + ' policies');
    
    // Debug output for each policy
    policies.forEach(policy => {
      const ipRanges = policy.ipRanges?.map(r => r.ipAddress).join(', ') || 'none';
      const profileIds = policy.profiles.map(p => p.id).join(', ');
      addToLog(`Policy: ${policy.name}, IP Ranges: ${ipRanges}, Profiles: ${profileIds}`);
    });
  }
};

// Start monitoring for IP address changes
const startMonitoring = async () => {
  if (monitoringState.isRunning) {
    console.log('Profile monitoring service is already running');
    return;
  }
  
  monitoringState.isRunning = true;
  addToLog('Profile monitoring service started');
  
  // Initial fetch of device IPs
  try {
    const devices = await simplemdmApi.getDevices({ limit: 100 });
    if (devices?.data) {
      devices.data.forEach(device => {
        const deviceId = device.id.toString();
        const ip = device.attributes.last_seen_ip;
        if (ip) {
          monitoringState.knownDeviceIPs.set(deviceId, ip);
          
          // Check if this device already has our target IP
          if (ip === TARGET_IP) {
            addToLog(`👀 Initial detection: Device ${deviceId} (${device.attributes.name}) has target IP ${TARGET_IP}`);
            handleDeviceWithTargetIP(device);
          }
        }
      });
      
      addToLog(`Initial device scan complete. Found ${monitoringState.knownDeviceIPs.size} devices with IP addresses.`);
    }
  } catch (error) {
    console.error('Error fetching initial device data:', error);
    addToLog(`⚠️ Error fetching initial device data: ${error.message}`);
  }
};

// Stop monitoring
const stopMonitoring = () => {
  monitoringState.isRunning = false;
  addToLog('Profile monitoring service stopped');
};

// Handle a device connection (called when device connects or changes network)
const handleDeviceConnection = async (deviceId: string, ipAddress: string) => {
  try {
    // Log the connection event
    addToLog(`Device ${deviceId} connected with IP ${ipAddress}`);
    
    // Update our known IP map
    const previousIp = monitoringState.knownDeviceIPs.get(deviceId);
    monitoringState.knownDeviceIPs.set(deviceId, ipAddress);
    
    // If the IP hasn't changed, no need to process further
    if (previousIp === ipAddress) {
      addToLog(`Device ${deviceId} IP unchanged (${ipAddress})`);
      return {
        policyApplied: false,
        policyName: "",
        profilesPushed: 0,
        noChanges: true
      };
    }
    
    // Log the IP change
    addToLog(`Device ${deviceId} IP changed from ${previousIp || 'unknown'} to ${ipAddress}`);
    
    // Check if this is our target IP - special case handling
    if (ipAddress === TARGET_IP) {
      addToLog(`🎯 TARGET MATCH: Device ${deviceId} has our target IP ${TARGET_IP}`);
      
      // Get the full device details
      const deviceResponse = await simplemdmApi.getDevice(deviceId);
      if (deviceResponse?.data) {
        addToLog(`Fetched details for device ${deviceId} (${deviceResponse.data.attributes.name})`);
        return await handleDeviceWithTargetIP(deviceResponse.data);
      }
    }
    
    // Otherwise, find matching policies based on IP
    const matchingPolicies = findMatchingPolicies(ipAddress);
    
    if (matchingPolicies.length === 0) {
      addToLog(`No policies match IP ${ipAddress} for device ${deviceId}`);
      return {
        policyApplied: false,
        policyName: "",
        profilesPushed: 0,
        noMatches: true
      };
    }
    
    // Get the first matching policy (could implement priority logic here)
    const activePolicy = matchingPolicies[0];
    addToLog(`Using policy ${activePolicy.name} for device ${deviceId}`);
    
    // Push all profiles from the matching policy
  async checkAndEnforceProfiles(deviceId: number, profileIds: number[]): Promise<{
    checked: number,
    missing: number,
    installed: number,
    failedInstalls: number
  }> {
    const result = {
      checked: profileIds.length,
      missing: 0,
      installed: 0,
      failedInstalls: 0
    };
    
    try {
      // Check each profile
      for (const profileId of profileIds) {
        const isInstalled = await simplemdmApi.isProfileInstalledOnDevice(profileId, deviceId);
        
        if (!isInstalled) {
          result.missing++;
          
          // Try to install the missing profile
          try {
            await simplemdmApi.pushProfileToDevice(profileId, deviceId);
            result.installed++;
            console.log(`Successfully installed profile ${profileId} on device ${deviceId}`);
          } catch (error) {
            result.failedInstalls++;
            console.error(`Failed to install profile ${profileId} on device ${deviceId}:`, error);
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Error checking/enforcing profiles for device ${deviceId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all active monitoring sessions
   * @returns Array of all active monitoring sessions
   */
  getActiveSessions(): MonitoringSession[] {
    return Array.from(this.monitoringSessions.values())
      .filter(session => session.active);
  }
  
  /**
   * Check if a device is being monitored for a specific policy
   * @param deviceId The device ID
   * @param policyId The policy ID
   * @returns Boolean indicating if the device is being actively monitored
   */
  isBeingMonitored(deviceId: number, policyId: number): boolean {
    const sessionKey = this.getSessionKey(deviceId, policyId);
    const session = this.monitoringSessions.get(sessionKey);
    return session ? session.active : false;
  }
  
  /**
   * Stop all monitoring sessions
   */
  stopAllMonitoring(): void {
    for (const session of this.monitoringSessions.values()) {
      if (session.active) {
        window.clearInterval(session.timerId);
        session.active = false;
      }
    }
    console.log(`Stopped all profile monitoring sessions`);
  }
}

const profileMonitoringService = new ProfileMonitoringService();
export default profileMonitoringService;