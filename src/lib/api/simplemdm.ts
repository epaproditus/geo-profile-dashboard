import axios from 'axios';
import locationProfileService from '../services/location-profile-service';
import { supabase } from '../supabase';

// API Configuration
const BASE_URL = import.meta.env.PROD 
  ? '/api/simplemdm'  // Use proxy in production
  : '/api/simplemdm'; // Also use proxy in development for consistency

// Create an axios instance with default configuration
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor to include Supabase token with every request
apiClient.interceptors.request.use(async (config) => {
  try {
    // Get the current session from Supabase
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    
    if (session?.access_token) {
      // Add the access token as a Bearer token
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Service subscription type
export interface ServiceSubscription {
  slot: string;
  carrier_settings_version: string | null;
  current_carrier_network: string | null;
  current_mcc: string | null;
  current_mnc: string | null;
  iccid: string | null;
  imei: string | null;
  phone_number: string | null;
  is_data_preferred: boolean;
  is_voice_preferred: boolean;
  label: string | null;
  meid: string | null;
  eid: string | null;
}

// SimpleMDM API Types
export interface SimpleMDMDevice {
  type: string;
  id: number;
  attributes: {
    name: string;
    last_seen_at: string | null;
    last_seen_ip: string | null;
    enrolled_at: string | null;
    status: string;
    enrollment_channels: string[];
    device_name: string | null;
    auto_admin_name: string | null;
    os_version: string | null;
    build_version: string | null;
    supplemental_build_version: string | null;
    supplemental_os_version_extra: string | null;
    model_name: string;
    model: string | null;
    product_name: string | null;
    unique_identifier: string | null;
    serial_number: string | null;
    processor_architecture: string | null;
    imei: string | null;
    meid: string | null;
    device_capacity: number | null;
    available_device_capacity: number | null;
    battery_level: string | null;
    modem_firmware_version: string | null;
    iccid: string | null;
    bluetooth_mac: string | null;
    ethernet_macs: string[];
    wifi_mac: string | null;
    current_carrier_network: string | null;
    sim_carrier_network: string | null;
    subscriber_carrier_network: string | null;
    carrier_settings_version: string | null;
    phone_number: string | null;
    voice_roaming_enabled: boolean;
    data_roaming_enabled: boolean;
    is_roaming: boolean;
    subscriber_mcc: string | null;
    subscriber_mnc: string | null;
    simmnc: string | null;
    current_mcc: string | null;
    current_mnc: string | null;
    hardware_encryption_caps: number | null;
    passcode_present: boolean;
    passcode_compliant: boolean;
    passcode_compliant_with_profiles: boolean;
    is_supervised: boolean;
    is_dep_enrollment: boolean;
    dep_enrolled: boolean;
    dep_assigned: boolean;
    is_user_approved_enrollment: boolean | null;
    is_device_locator_service_enabled: boolean;
    is_do_not_disturb_in_effect: boolean;
    personal_hotspot_enabled: boolean | null;
    itunes_store_account_is_active: boolean;
    cellular_technology: number | null;
    last_cloud_backup_date: string | null;
    is_activation_lock_enabled: boolean;
    is_cloud_backup_enabled: boolean;
    filevault_enabled: boolean | null;
    filevault_recovery_key: string | null;
    lost_mode_enabled: boolean;
    firmware_password_enabled: boolean | null;
    recovery_lock_password_enabled: boolean | null;
    remote_desktop_enabled: boolean | null;
    time_zone: string | null;
    user_enrollment: boolean;
    ddm_enabled: boolean;
    firmware_password: string | null;
    recovery_lock_password: string | null;
    firewall: {
      enabled: boolean | null;
      block_all_incoming: boolean | null;
      stealth_mode: boolean | null;
    };
    system_integrity_protection_enabled: boolean | null;
    os_update: {
      automatic_os_installation_enabled: boolean | null;
      automatic_app_installation_enabled: boolean | null;
      automatic_check_enabled: boolean | null;
      automatic_security_updates_enabled: boolean | null;
      background_download_enabled: boolean | null;
      catalog_url: string | null;
      default_catalog: string | null;
      perform_periodic_check: boolean | null;
      previous_scan_date: string | null;
      previous_scan_result: string | null;
    };
    service_subscriptions: ServiceSubscription[];
    location_latitude: string | null;
    location_longitude: string | null;
    location_accuracy: number | null;
    location_updated_at: string | null;
  };
  relationships?: {
    device_group?: {
      data: {
        type: string;
        id: number;
      }
    }
    custom_attribute_values?: {
      data: any[];
    }
  };
}

export interface SimpleMDMApp {
  type: string;
  id: number;
  attributes: {
    name: string;
    bundle_identifier: string | null;
    app_type: string;
    itunes_store_id: number | null;
    version: string | null;
    managed: boolean;
    removable: boolean;
    has_settings: boolean;
    has_feedback: boolean;
    has_config_options: boolean;
    size_in_bytes: number | null;
    created_at: string;
    updated_at: string;
    binary_available: boolean;
    waiting_for_upload: boolean;
    status: string;
    app_store_preview: {
      title: string | null;
      developer: string | null;
      app_store_url: string | null;
      artwork_url: string | null;
      description: string | null;
    } | null;
  };
}

export interface SimpleMDMProfile {
  type: string;
  id: number;
  attributes: {
    name: string;
    description: string | null;
    profile_type: string;
    status: string;
    created_at: string;
    updated_at: string;
    has_config_options: boolean;
    has_settings: boolean;
    custom_attributes?: {
      isDefault?: boolean;
      associatedGeofences?: Array<{
        id: string | number;
        name: string;
        radius?: number;
        address?: string;
      }>;
    };
  };
}

export interface SimpleMDMResponse<T> {
  data: T;
  has_more?: boolean;
}

export interface SimpleMDMListResponse<T> {
  data: T[];
  has_more?: boolean;
}

// API Functions
export const simplemdmApi = {
  // Get a list of all devices
  async getDevices(params?: { limit?: number; starting_after?: string; direction?: 'asc' | 'desc' }) {
    try {
      const response = await apiClient.get<SimpleMDMListResponse<SimpleMDMDevice>>('/devices', { params });
      
      // Update timestamp for each device we receive
      if (response.data.data && Array.isArray(response.data.data)) {
        response.data.data.forEach(device => {
          locationProfileService.updateDeviceLocationTimestamp(device.id);
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  },

  // Get a single device by ID
  async getDevice(deviceId: number | string) {
    try {
      const response = await apiClient.get<SimpleMDMResponse<SimpleMDMDevice>>(`/devices/${deviceId}`);
      
      // Update timestamp for this device
      locationProfileService.updateDeviceLocationTimestamp(deviceId);
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching device ${deviceId}:`, error);
      throw error;
    }
  },

  // Request device location update
  async updateDeviceLocation(deviceId: number | string) {
    try {
      // Use the proper location update endpoint to request a fresh location from the device
      await apiClient.post(`/devices/${deviceId}/lost_mode/update_location`);
      
      // Update timestamp for this device when we explicitly request a location update
      locationProfileService.updateDeviceLocationTimestamp(deviceId);
      
      // Return the current device data. Location updates may take time to complete.
      // The device will send its location data asynchronously, so we need to fetch
      // again later to get the updated location.
      const response = await this.getDevice(deviceId);
      
      return {
        ...response,
        // Add a flag to indicate that a location update was requested
        locationUpdateRequested: true
      };
    } catch (error) {
      console.error(`Error updating location for device ${deviceId}:`, error);
      throw error;
    }
  },

  // Get a list of all applications in the app catalog
  async getApps(params?: { limit?: number; starting_after?: string }) {
    try {
      const response = await apiClient.get<SimpleMDMListResponse<SimpleMDMApp>>('/apps', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching apps:', error);
      throw error;
    }
  },

  // Get a single application by ID
  async getApp(appId: number | string) {
    try {
      const response = await apiClient.get<SimpleMDMResponse<SimpleMDMApp>>(`/apps/${appId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching app ${appId}:`, error);
      throw error;
    }
  },
  
  // Push apps to devices via assignment group
  async pushAppsToAssignmentGroup(assignmentGroupId: number | string) {
    try {
      const response = await apiClient.post(`/assignment_groups/${assignmentGroupId}/push_apps`);
      return response.data;
    } catch (error) {
      console.error(`Error pushing apps to assignment group ${assignmentGroupId}:`, error);
      throw error;
    }
  },
  
  // Get assignment groups
  async getAssignmentGroups(params?: { limit?: number; starting_after?: string }) {
    try {
      const response = await apiClient.get('/assignment_groups', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching assignment groups:', error);
      throw error;
    }
  },
  
  // Get a single assignment group
  async getAssignmentGroup(assignmentGroupId: number | string) {
    try {
      const response = await apiClient.get(`/assignment_groups/${assignmentGroupId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching assignment group ${assignmentGroupId}:`, error);
      throw error;
    }
  },
  
  // Get profiles
  async getProfiles(params?: { limit?: number; starting_after?: string }) {
    try {
      const response = await apiClient.get<SimpleMDMListResponse<SimpleMDMProfile>>('/profiles', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching profiles:', error);
      throw error;
    }
  },
  
  // Get a specific profile
  async getProfile(profileId: number | string) {
    try {
      const response = await apiClient.get<SimpleMDMResponse<SimpleMDMProfile>>(`/profiles/${profileId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching profile ${profileId}:`, error);
      throw error;
    }
  },
  
  // Push a profile to a specific device
  async pushProfileToDevice(profileId: number | string, deviceId: number | string) {
    try {
      const response = await apiClient.post(`/profiles/${profileId}/devices/${deviceId}`);
      return response.data;
    } catch (error) {
      console.error(`Error pushing profile ${profileId} to device ${deviceId}:`, error);
      throw error;
    }
  },

  // Get all profiles installed on a specific device
  async getDeviceProfiles(deviceId: number | string) {
    try {
      const response = await apiClient.get<SimpleMDMListResponse<SimpleMDMProfile>>(`/devices/${deviceId}/profiles`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching profiles for device ${deviceId}:`, error);
      throw error;
    }
  },
  
  // Check if a specific profile is installed on a device
  async isProfileInstalledOnDevice(profileId: number | string, deviceId: number | string): Promise<boolean> {
    try {
      const profiles = await this.getDeviceProfiles(deviceId);
      return profiles.data.some(profile => profile.id.toString() === profileId.toString());
    } catch (error) {
      console.error(`Error checking if profile ${profileId} is installed on device ${deviceId}:`, error);
      return false; // Assume not installed if there's an error
    }
  },
  
  // Remove a profile from a specific device - handles 409 errors gracefully
  async removeProfileFromDevice(profileId: number | string, deviceId: number | string) {
    console.log(`Removing profile ${profileId} from device ${deviceId}`);
    
    try {
      const response = await apiClient.delete(`/profiles/${profileId}/devices/${deviceId}`);
      console.log(`Profile ${profileId} successfully removed from device ${deviceId}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      // Handle 409 conflict errors - likely means the profile is not installed or already removed
      if (error?.response?.status === 409) {
        console.log(`Profile ${profileId} was not removed from device ${deviceId} - 409 Conflict (profile may not be installed)`);
        return { success: true, alreadyRemoved: true };
      }
      
      console.error(`Failed to remove profile ${profileId} from device ${deviceId}:`, error);
      throw error;
    }
  },

  /**
   * Check if a profile is removed from a device
   */
  async isProfileRemovedFromDevice(profileId: string, deviceId: string): Promise<boolean> {
    try {
      // This checks if a profile is installed on a device
      await apiClient.get(`/devices/${deviceId}/profiles/${profileId}`);
      // If the above doesn't throw, the profile exists
      return false;
    } catch (error: any) {
      // If the error is 404, that means the profile is not installed
      if (error?.response?.status === 404) {
        return true;
      }
      // For other errors, rethrow
      throw error;
    }
  },

  // Get all profiles (handling pagination)
  async getAllProfiles() {
    try {
      let allProfiles: SimpleMDMProfile[] = [];
      let hasMore = true;
      let startingAfter: string | undefined = undefined;
      
      // Use a higher limit to reduce API calls
      const limit = 100;
      
      console.log('Starting pagination to fetch all profiles...');
      
      while (hasMore) {
        console.log(`Fetching profiles batch with starting_after=${startingAfter || 'none'}`);
        const response = await this.getProfiles({ 
          limit, 
          starting_after: startingAfter 
        });
        
        if (!response.data || !Array.isArray(response.data)) {
          console.error('Unexpected response format when fetching profiles:', response);
          break;
        }
        
        console.log(`Received ${response.data.length} profiles in this batch`);
        
        // Add the current page of profiles to our result
        allProfiles = [...allProfiles, ...response.data];
        
        // Check if there are more profiles to fetch
        hasMore = response.has_more || false;
        
        // Set the cursor for the next page if there are more
        if (hasMore && response.data.length > 0) {
          startingAfter = response.data[response.data.length - 1].id.toString();
          console.log(`More profiles exist, next cursor: ${startingAfter}`);
        } else {
          console.log('No more profiles to fetch');
        }
      }
      
      console.log(`Retrieved ${allProfiles.length} total profiles`);
      return { data: allProfiles };
    } catch (error) {
      console.error('Error fetching all profiles:', error);
      throw error;
    }
  },
};

export default simplemdmApi;