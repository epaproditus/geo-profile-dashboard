import axios from 'axios';

// API Configuration
const BASE_URL = 'https://a.simplemdm.com/api/v1';
const API_KEY = import.meta.env.VITE_SIMPLEMDM_API_KEY;

// Create an axios instance with default configuration
const apiClient = axios.create({
  baseURL: BASE_URL,
  auth: {
    username: API_KEY || '',
    password: '',
  },
  headers: {
    'Content-Type': 'application/json',
  },
});

// SimpleMDM API Types
export interface SimpleMDMDevice {
  type: string;
  id: number;
  attributes: {
    name: string;
    last_seen_at: string | null;
    last_seen_ip: string | null;
    status: string;
    device_name: string | null;
    os_version: string | null;
    build_version: string | null;
    model_name: string;
    model: string | null;
    product_name: string | null;
    unique_identifier: string | null;
    serial_number: string | null;
    imei: string | null;
    meid: string | null;
    available_device_capacity: number | null;
    device_capacity: number | null;
    battery_level: number | null;
    location_latitude: string | null;
    location_longitude: string | null;
    location_accuracy: string | null;
    location_updated_at: string | null;
  };
  relationships?: {
    device_group?: {
      data: {
        type: string;
        id: number;
      }
    }
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
      return response.data;
    } catch (error) {
      console.error(`Error fetching device ${deviceId}:`, error);
      throw error;
    }
  },

  // Request device location update
  async updateDeviceLocation(deviceId: number | string) {
    try {
      const response = await apiClient.post(`/devices/${deviceId}/lost_mode/update_location`);
      return response.data;
    } catch (error) {
      console.error(`Error updating location for device ${deviceId}:`, error);
      throw error;
    }
  }
};

export default simplemdmApi;