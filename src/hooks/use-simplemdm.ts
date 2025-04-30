import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { simplemdmApi, SimpleMDMDevice, SimpleMDMListResponse } from '../lib/api/simplemdm';

// Hook to fetch all devices
export const useDevices = (params?: { limit?: number; starting_after?: string; direction?: 'asc' | 'desc' }) => {
  return useQuery<SimpleMDMListResponse<SimpleMDMDevice>>({
    queryKey: ['devices', params],
    queryFn: () => simplemdmApi.getDevices(params),
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
  
  return useMutation({
    mutationFn: (deviceId: number | string) => 
      simplemdmApi.updateDeviceLocation(deviceId),
    onSuccess: (_data, deviceId) => {
      // Invalidate the device query to refetch with updated location
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
    },
  });
};