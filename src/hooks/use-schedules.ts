import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '@/lib/services/schedule-service';
import { Schedule, ScheduleCreate } from '@/types/schedule';
import { useToast } from './use-toast';

// Hook for fetching a single schedule by ID
export function useSchedule(id?: string) {
  return useQuery({
    queryKey: ['schedule', id],
    queryFn: () => id ? scheduleService.getById(id) : null,
    enabled: !!id
  });
}

// Hook for creating a schedule
export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (newSchedule: ScheduleCreate) => scheduleService.create(newSchedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'Success',
        description: 'Schedule created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create schedule: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook for updating a schedule
export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    // Update the parameter structure to match what ScheduleForm expects
    mutationFn: (data: Partial<Schedule> & { id: string }) => {
      const { id, ...schedule } = data;
      return scheduleService.update(id, schedule);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', variables.id] });
      toast({
        title: 'Success',
        description: 'Schedule updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update schedule: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook for deleting a schedule
export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (id: string) => scheduleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'Success',
        description: 'Schedule deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete schedule: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Hook for managing schedules in the UI
export function useSchedules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all schedules
  const {
    data: schedules,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      console.log("useSchedules: Calling scheduleService.getAll()");
      const result = await scheduleService.getAll();
      console.log("useSchedules: Received result from scheduleService.getAll()", result);
      return result;
    },
    // Ensure stale data is refetched if needed
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Retry on failure
    retry: 1, 
  });

  // Create a new schedule
  const createSchedule = useMutation({
    mutationFn: (newSchedule: ScheduleCreate) => scheduleService.create(newSchedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'Success',
        description: 'Schedule created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create schedule: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update a schedule
  const updateSchedule = useMutation({
    mutationFn: (data: Partial<Schedule> & { id: string }) => {
      const { id, ...schedule } = data;
      return scheduleService.update(id, schedule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'Success',
        description: 'Schedule updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update schedule: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete a schedule
  const deleteSchedule = useMutation({
    mutationFn: (id: string) => scheduleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'Success',
        description: 'Schedule deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete schedule: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Toggle schedule enabled status
  const toggleScheduleEnabled = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => 
      scheduleService.toggleEnabled(id, enabled),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'Success',
        description: `Schedule ${data.enabled ? 'enabled' : 'disabled'} successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update schedule status: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    schedules,
    isLoading,
    error,
    refetch,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    toggleScheduleEnabled,
  };
}

// Hook for toggling schedule status (renamed to match what Schedules.tsx expects)
export function useToggleScheduleStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => 
      scheduleService.toggleEnabled(id, enabled),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'Success',
        description: `Schedule ${data.enabled ? 'enabled' : 'disabled'} successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update schedule status: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}