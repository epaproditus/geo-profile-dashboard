import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { simplemdmApi, SimpleMDMDevice, SimpleMDMListResponse, SimpleMDMApp, SimpleMDMResponse } from '../lib/api/simplemdm';
import { useToast } from "@/hooks/use-toast";

// Hook to fetch all devices
export const useDevices = (params?: { limit?: number; starting_after?: string; direction?: 'asc' | 'desc' }) => {
  return useQuery<SimpleMDMListResponse<SimpleMDMDevice>>({
    queryKey: ['devices', params],
    queryFn: () => simplemdmApi.getDevices(params),
    staleTime: 0, // Consider data stale immediately so it will refetch
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
};

// Hook to fetch a single device
export const useDevice = (deviceId: number | string) => {
  return useQuery({
    queryKey: ['device', deviceId],
    queryFn: () => simplemdmApi.getDevice(deviceId),
    enabled: !!deviceId,
  });
};

// Hook to update a device's location
export const useUpdateDeviceLocation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (deviceId: number | string) => 
      simplemdmApi.updateDeviceLocation(deviceId),
    // We'll remove the onSuccess toast since we're now handling this in the Dashboard component
    // This avoids showing duplicate toasts to the user
    onSuccess: (_data, deviceId) => {
      // Invalidate the device query to refetch with updated location
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
      
      // Also invalidate the devices list query to refresh the dashboard
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error: any) => {
      toast({
        title: "Location Update Failed",
        description: error.message || "Failed to request device location update.",
        variant: "destructive",
      });
    },
  });
};

// Helper function to check if a device is sharing its location (updated within the last 5 minutes)
export const isLocationSharing = (device: SimpleMDMDevice | undefined): boolean => {
  if (!device || !device.attributes.location_updated_at) return false;
  
  const locationUpdatedAt = new Date(device.attributes.location_updated_at);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes in milliseconds
  
  return locationUpdatedAt > fiveMinutesAgo;
};

// Hook to fetch all apps in the app catalog
export const useApps = (params?: { limit?: number; starting_after?: string }) => {
  return useQuery<SimpleMDMListResponse<SimpleMDMApp>>({
    queryKey: ['apps', params],
    queryFn: () => simplemdmApi.getApps(params),
  });
};

// Hook to fetch a single app
export const useApp = (appId: number | string) => {
  return useQuery<SimpleMDMResponse<SimpleMDMApp>>({
    queryKey: ['app', appId],
    queryFn: () => simplemdmApi.getApp(appId),
    enabled: !!appId,
  });
};

// Define AssignmentGroup interface
export interface SimpleMDMAssignmentGroup {
  type: string;
  id: number;
  attributes: {
    name: string;
    created_at: string;
    updated_at: string;
  };
  relationships: {
    apps: {
      data: { type: string; id: number }[];
    };
    devices: {
      data: { type: string; id: number }[];
    };
    device_groups: {
      data: { type: string; id: number }[];
    };
  };
}

// Hook to fetch all assignment groups
export const useAssignmentGroups = (params?: { limit?: number; starting_after?: string }) => {
  return useQuery<SimpleMDMListResponse<SimpleMDMAssignmentGroup>>({
    queryKey: ['assignmentGroups', params],
    queryFn: () => simplemdmApi.getAssignmentGroups(params),
  });
};

// Hook to fetch a single assignment group
export const useAssignmentGroup = (assignmentGroupId: number | string) => {
  return useQuery<SimpleMDMResponse<SimpleMDMAssignmentGroup>>({
    queryKey: ['assignmentGroup', assignmentGroupId],
    queryFn: () => simplemdmApi.getAssignmentGroup(assignmentGroupId),
    enabled: !!assignmentGroupId,
  });
};

// Hook to push apps to devices via assignment group
export const usePushAppsToAssignmentGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (assignmentGroupId: number | string) => 
      simplemdmApi.pushAppsToAssignmentGroup(assignmentGroupId),
    onSuccess: (_data, assignmentGroupId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['assignmentGroup', assignmentGroupId] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      
      toast({
        title: "Apps Installation Requested",
        description: "App installation has been requested for devices in the assignment group. This may take some time to complete.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "App Installation Failed",
        description: error.message || "Failed to push apps to devices.",
        variant: "destructive",
      });
    },
  });
};

// Define profiles hooks
export const useProfiles = (params?: { limit?: number; starting_after?: string }) => {
  return useQuery<SimpleMDMListResponse<SimpleMDMProfile>>({
    queryKey: ['profiles', params],
    queryFn: () => simplemdmApi.getProfiles(params),
  });
};

export const useProfile = (profileId: number | string) => {
  return useQuery<SimpleMDMResponse<SimpleMDMProfile>>({
    queryKey: ['profile', profileId],
    queryFn: () => simplemdmApi.getProfile(profileId),
    enabled: !!profileId,
  });
};

// New hook to fetch ALL profiles with pagination handling
export const useAllProfiles = () => {
  return useQuery<{ data: SimpleMDMProfile[] }>({
    queryKey: ['allProfiles'],
    queryFn: () => simplemdmApi.getAllProfiles(),
    staleTime: 5 * 60 * 1000, // 5 minutes cache to avoid repeated calls
  });
};

export const usePushProfileToDevice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ profileId, deviceId }: { profileId: number | string; deviceId: number | string }) => 
      simplemdmApi.pushProfileToDevice(profileId, deviceId),
    onSuccess: (_data, { profileId, deviceId }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
      
      toast({
        title: "Profile Installation Requested",
        description: "Profile has been pushed to the device. This may take some time to apply.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Profile Installation Failed",
        description: error.message || "Failed to push profile to device.",
        variant: "destructive",
      });
    },
  });
};

// Hook to download a custom configuration profile
export const useDownloadCustomConfigurationProfile = () => {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (profileId: number | string) => 
      simplemdmApi.downloadCustomConfigurationProfile(profileId),
    onError: (error: any) => {
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download profile content.",
        variant: "destructive",
      });
    },
  });
};