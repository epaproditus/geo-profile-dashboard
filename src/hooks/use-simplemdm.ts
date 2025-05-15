import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { simplemdmApi, SimpleMDMDevice, SimpleMDMListResponse, SimpleMDMApp, SimpleMDMResponse, SimpleMDMProfile } from '../lib/api/simplemdm';
import { useToast } from "@/hooks/use-toast";
import { useSupabase } from "@/lib/supabase";

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

import { notifyProfileInstallation } from '@/lib/ntfy';

export const usePushProfileToDevice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { supabase } = useSupabase();
  
  return useMutation({
    mutationFn: async ({ 
      profileId, 
      deviceId, 
      isTemporary = false, 
      temporaryDuration = 30,
      enableNotifications = true,
      profileName = '',
      deviceName = ''
    }: { 
      profileId: number | string; 
      deviceId: number | string;
      isTemporary?: boolean;
      temporaryDuration?: number;
      enableNotifications?: boolean;
      profileName?: string;
      deviceName?: string;
    }) => {
      try {
        // Current timestamp
        const now = new Date();
        
        // Scheduled time for 1 minute from now
        const scheduledTime = new Date(now.getTime() + 60000); // 1 minute in milliseconds
        
        // 1. Create a schedule for installing the profile
        const { data: installSchedule, error: installError } = await supabase
          .from('schedules')
          .insert({
            profile_id: profileId,
            action_type: 'push_profile',
            device_id: deviceId,
            start_time: scheduledTime.toISOString(),
            schedule_type: 'one_time',
            enabled: true,
            created_by: 'ui',
            created_at: now.toISOString(),
            ui_initiated: true,
            last_executed_at: null,
            metadata: {
              notify: enableNotifications,
              profile_name: profileName,
              device_name: deviceName,
              is_temporary: isTemporary,
              temporary_duration: isTemporary ? temporaryDuration : 0
            }
          })
          .select()
          .single();
          
        if (installError) {
          throw new Error(`Failed to create install schedule: ${installError.message}`);
        }
        
        // 2. If this is a temporary profile, schedule its removal
        if (isTemporary && temporaryDuration > 0) {
          // Calculate removal time
          const removalTime = new Date(now.getTime() + (temporaryDuration * 60000));
          
          const { error: removalError } = await supabase
            .from('schedules')
            .insert({
              profile_id: profileId,
              action_type: 'remove_profile',
              device_id: deviceId,
              start_time: removalTime.toISOString(),
              schedule_type: 'one_time',
              enabled: true,
              created_by: 'ui',
              created_at: now.toISOString(),
              parent_schedule_id: installSchedule.id,
              ui_initiated: true,
              last_executed_at: null,
              metadata: {
                notify: enableNotifications,
                profile_name: profileName,
                device_name: deviceName,
                is_temporary: true,
                was_temporary_installation: true,
                original_duration: temporaryDuration
              }
            });
            
          if (removalError) {
            throw new Error(`Failed to create removal schedule: ${removalError.message}`);
          }
        }
        
        return { success: true };
      } catch (error) {
        console.error("Error scheduling profile push:", error);
        throw error;
      }
    },
    onSuccess: (_data, { profileId, deviceId, isTemporary, temporaryDuration, profileName, deviceName, enableNotifications }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
      
      // Also invalidate schedules query if viewing the Schedules page
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      
      // Show toast notification
      if (isTemporary) {
        toast({
          title: "Temporary Profile Scheduled",
          description: `Profile will be installed shortly and automatically removed after ${temporaryDuration} minutes.`,
        });
      } else {
        toast({
          title: "Profile Installation Scheduled",
          description: "Profile will be installed on the device shortly.",
        });
      }
      
      // Send push notification if enabled
      if (enableNotifications && profileName && deviceName) {
        // Send a notification for the profile installation
        // This is just to give immediate feedback to the user that the process has started
        // The actual installation notification will be sent by the executor.js script
        notifyProfileInstallation({
          profileName,
          profileId,
          deviceName,
          deviceId,
          isTemporary,
          temporaryDuration
        }).catch(error => {
          console.error('Error sending installation notification:', error);
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Profile Installation Failed",
        description: error.message || "Failed to schedule profile installation.",
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