// Create a new service for handling profile policies with Supabase
import { supabase, policiesDB } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

// Type definitions
export interface Location {
  displayName: string;
  latitude: number;
  longitude: number;
  radius: number;
  geofenceId: string;
}

export interface IpRange {
  displayName: string;
  ipAddress: string;
  geofenceId: string;
}

export interface Device {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  name: string;
}

export interface ZonePolicy {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  locations: Location[];
  ipRanges?: IpRange[];
  devices: Device[];
  profiles: Profile[];
}

// Default policies if none exist
export const defaultPolicies: ZonePolicy[] = [
  {
    id: uuidv4(),
    name: "Default Policy",
    description: "Applied when no other policies match",
    isDefault: true,
    locations: [],
    ipRanges: [],
    devices: [],
    profiles: []
  }
];

/**
 * Service for managing profile policies with Supabase
 */
class ProfilePolicyService {
  /**
   * Get all policies for the current user
   */
  async getPolicies(): Promise<ZonePolicy[]> {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No authenticated user");
        toast.error("Authentication required to access policies");
        return [];
      }

      const { data, error } = await policiesDB.getPolicies();

      if (error) {
        console.error("Error fetching policies:", error);
        // Check if this is a table not found error or similar
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          toast.error("Policies database table not yet created");
        } else {
          toast.error("Failed to load policies from the database");
        }
        return [];
      }

      if (data.length === 0) {
        // If no policies in Supabase, create a default one
        const defaultPolicy = defaultPolicies[0];
        const createdPolicy = await this.createPolicy(defaultPolicy);
        return [createdPolicy];
      }

      // Transform database format to application format
      return data.map(policy => ({
        id: policy.id,
        name: policy.name,
        description: policy.description,
        isDefault: policy.is_default,
        locations: policy.locations || [],
        ipRanges: policy.ip_ranges || [],
        devices: policy.devices || [],
        profiles: policy.profiles || []
      }));
    } catch (error) {
      console.error("Error in getPolicies method:", error);
      toast.error("Failed to fetch policies");
      return [];
    }
  }

  /**
   * Create a new policy
   */
  async createPolicy(policy: Omit<ZonePolicy, 'id'>): Promise<ZonePolicy> {
    const newPolicy = {
      ...policy,
      id: uuidv4()
    };

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No authenticated user");
      toast.error("Authentication required to create policies");
      throw new Error("Authentication required");
    }

    const { data, error } = await policiesDB.createPolicy({
      name: newPolicy.name,
      description: newPolicy.description,
      is_default: newPolicy.isDefault,
      locations: newPolicy.locations,
      ip_ranges: newPolicy.ipRanges || [],
      devices: newPolicy.devices,
      profiles: newPolicy.profiles
    });

    if (error || !data) {
      console.error("Error creating policy:", error);
      toast.error("Failed to save policy to the database");
      throw new Error("Failed to create policy");
    }

    toast.success("Policy saved successfully");
    
    // Convert Supabase response format to ZonePolicy format
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      isDefault: data.is_default,
      locations: data.locations || [],
      ipRanges: data.ip_ranges || [],
      devices: data.devices || [],
      profiles: data.profiles || []
    };
  }

  /**
   * Update an existing policy
   */
  async updatePolicy(policy: ZonePolicy): Promise<ZonePolicy> {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No authenticated user");
      toast.error("Authentication required to update policies");
      throw new Error("Authentication required");
    }

    try {
      // Handle legacy "default-policy" ID by converting to UUID
      if (policy.id === "default-policy") {
        console.log("Converting legacy default-policy ID to UUID");
        // Try to find the default policy
        const policies = await this.getPolicies();
        const defaultPolicy = policies.find(p => p.isDefault);
        
        if (defaultPolicy && defaultPolicy.id !== "default-policy") {
          // Update the existing default policy with this policy's data
          const updatedPolicy = {
            ...policy,
            id: defaultPolicy.id // Use the real UUID
          };
          return this.updatePolicy(updatedPolicy);
        } else {
          // Create a new default policy with a valid UUID
          const newDefault = await this.createDefaultPolicy();
          // Now update it with this policy's data
          const updatedPolicy = {
            ...policy,
            id: newDefault.id
          };
          return this.updatePolicy(updatedPolicy);
        }
      }

      // Continue with normal policy update
      const { data, error } = await policiesDB.updatePolicy(policy.id, {
        name: policy.name,
        description: policy.description,
        is_default: policy.isDefault,
        locations: policy.locations,
        ip_ranges: policy.ipRanges || [],
        devices: policy.devices,
        profiles: policy.profiles
      });

      if (error || !data) {
        console.error("Error updating policy:", error);
        toast.error("Failed to update policy in the database");
        throw new Error("Failed to update policy");
      }

      toast.success("Policy updated successfully");
      
      // Convert Supabase response format to ZonePolicy format
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        isDefault: data.is_default,
        locations: data.locations || [],
        ipRanges: data.ip_ranges || [],
        devices: data.devices || [],
        profiles: data.profiles || []
      };
    } catch (error) {
      console.error(`Error in updatePolicy for policy ${policy.id}:`, error);
      toast.error("Failed to update policy");
      throw error;
    }
  }

  /**
   * Delete a policy
   */
  async deletePolicy(policyId: string): Promise<boolean> {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No authenticated user");
      toast.error("Authentication required to delete policies");
      throw new Error("Authentication required");
    }

    try {
      // Handle legacy "default-policy" ID
      if (policyId === "default-policy") {
        console.log("Cannot delete the default policy with legacy ID");
        toast.error("Cannot delete the default policy");
        return false;
      }

      const { error } = await policiesDB.deletePolicy(policyId);

      if (error) {
        console.error("Error deleting policy:", error);
        toast.error("Failed to delete policy from the database");
        throw new Error("Failed to delete policy");
      }

      toast.success("Policy deleted successfully");
      return true;
    } catch (error) {
      console.error(`Error in deletePolicy for ${policyId}:`, error);
      toast.error("Failed to delete policy");
      throw error;
    }
  }

  /**
   * Get a specific policy by ID
   */
  async getPolicyById(policyId: string): Promise<ZonePolicy | null> {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No authenticated user");
      toast.error("Authentication required to access policies");
      return null;
    }

    try {
      // Handle legacy "default-policy" ID by converting to UUID
      if (policyId === "default-policy") {
        console.log("Converting legacy default-policy ID to UUID");
        // Try to find the default policy
        const policies = await this.getPolicies();
        const defaultPolicy = policies.find(p => p.isDefault);
        if (defaultPolicy) {
          return defaultPolicy;
        } else {
          // Create a new default policy with a valid UUID
          return this.createDefaultPolicy();
        }
      }

      // Continue with normal policy retrieval
      const { data, error } = await policiesDB.getPolicy(policyId);

      if (error || !data) {
        console.error("Error fetching policy:", error);
        toast.error("Failed to fetch policy");
        return null;
      }

      // Convert Supabase response format to ZonePolicy format
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        isDefault: data.is_default,
        locations: data.locations || [],
        ipRanges: data.ip_ranges || [],
        devices: data.devices || [],
        profiles: data.profiles || []
      };
    } catch (error) {
      console.error(`Error in getPolicyById for ${policyId}:`, error);
      toast.error("Failed to fetch policy");
      return null;
    }
  }
  
  /**
   * Create a default policy with a proper UUID
   */
  private async createDefaultPolicy(): Promise<ZonePolicy> {
    const defaultPolicy: Omit<ZonePolicy, 'id'> = {
      name: "Default Policy",
      description: "Applied when no other policies match",
      isDefault: true,
      locations: [],
      ipRanges: [],
      devices: [],
      profiles: []
    };
    
    return this.createPolicy(defaultPolicy);
  }

  // Storage key for device policy history
  private static readonly DEVICE_POLICY_HISTORY_KEY = 'device-policy-history';
  
  /**
   * Process a device connection with IP address
   * This is the primary method for applying profiles based on IP address
   */
  async processDeviceConnection(
    deviceId: string,
    ipAddress: string
  ): Promise<{ 
    policyApplied: boolean, 
    policyName: string, 
    profilesPushed: number,
    profilesRemoved?: number
  }> {
    console.log(`Processing connection for device ${deviceId} with IP ${ipAddress}`);
    
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No authenticated user");
        toast.error("Authentication required to process device connection");
        return { policyApplied: false, policyName: "", profilesPushed: 0 };
      }

      // Get all policies
      const policies = await this.getPolicies();
      
      if (policies.length === 0) {
        console.log('No policies set, skipping profile application');
        return { policyApplied: false, policyName: "", profilesPushed: 0 };
      }
      
      // Find policies that match this device directly
      const directAssignedPolicies = policies.filter(policy => 
        !policy.isDefault && policy.devices.some(d => d.id === deviceId)
      );
      
      // Find policies that match by IP address
      const ipMatchingPolicies = policies.filter(policy => 
        !policy.isDefault && policy.ipRanges && policy.ipRanges.some(range => 
          this.isIpInRange(ipAddress, range.ipAddress)
        )
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
        activePolicy = policies.find(p => p.isDefault);
        matchReason = "default fallback";
      }
      
      if (!activePolicy) {
        console.log(`No applicable policy found for device ${deviceId}`);
        return { policyApplied: false, policyName: "", profilesPushed: 0 };
      }
      
      console.log(`Selected policy "${activePolicy.name}" for device ${deviceId} based on ${matchReason}`);
      
      // In a real implementation, we would push profiles to the device here
      // For now, we'll just log it and record the policy application
      this.recordPolicyApplication(deviceId, activePolicy.id, ipAddress);
      
      return { 
        policyApplied: true, 
        policyName: activePolicy.name, 
        profilesPushed: activePolicy.profiles.length
      };
    } catch (error) {
      console.error(`Error processing device connection:`, error);
      return { policyApplied: false, policyName: "", profilesPushed: 0 };
    }
  }
  
  /**
   * Record policy application history
   * This now uses cloud storage instead of localStorage
   */
  private recordPolicyApplication(deviceId: string, policyId: string, ipAddress: string): void {
    try {
      // In the future, we can implement this with Supabase
      // For now, we'll just log it without saving to localStorage
      console.log(`Policy application recorded: Device ${deviceId}, Policy ${policyId}, IP ${ipAddress}`);
      
      // Skip saving to localStorage
    } catch (error) {
      console.error('Error recording policy application:', error);
    }
  }
  
  /**
   * Load device policy application history
   */
  loadDevicePolicyHistory(): Array<{
    deviceId: string;
    policyId: string;
    ipAddress: string;
    timestamp: string;
  }> {
    // In the future, we can implement this with Supabase
    // For now, just return an empty array instead of using localStorage
    return [];
  }
  
  /**
   * Helper method to check if an IP is in a specified range
   */
  private isIpInRange(deviceIp: string, rangeIp: string): boolean {
    try {
      // Check for exact match first (most common case)
      if (deviceIp === rangeIp) {
        console.log(`IP exact match found: ${deviceIp} matches ${rangeIp}`);
        return true;
      }
      
      // Handle CIDR notation (e.g., "192.168.1.0/24")
      if (rangeIp.includes('/')) {
        // Simple string-based check for partial matches
        const baseIp = rangeIp.split('/')[0];
        const mask = parseInt(rangeIp.split('/')[1], 10);
        
        // For IP addresses like 64.209.154.154, check if they match the base
        if (mask >= 24 && deviceIp.startsWith(baseIp.substring(0, baseIp.lastIndexOf('.')))) {
          console.log(`IP subnet match found: ${deviceIp} is within ${rangeIp}`);
          return true;
        }
      }
      
      // For other formats like wildcard (e.g., "64.209.154.*")
      if (rangeIp.includes('*')) {
        const targetParts = rangeIp.split('.');
        const deviceParts = deviceIp.split('.');
        
        if (targetParts.length !== 4 || deviceParts.length !== 4) {
          return false;
        }
        
        for (let i = 0; i < 4; i++) {
          if (targetParts[i] !== '*' && targetParts[i] !== deviceParts[i]) {
            return false;
          }
        }
        
        console.log(`IP wildcard match found: ${deviceIp} matches ${rangeIp}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error checking IP match: ${error}`);
      return false;
    }
  }
}

// Export a singleton instance
const profilePolicyService = new ProfilePolicyService();
export default profilePolicyService;