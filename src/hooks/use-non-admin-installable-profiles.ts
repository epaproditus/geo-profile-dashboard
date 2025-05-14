import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";

// Hook to get all non-admin installable profile IDs
export const useNonAdminInstallableProfiles = () => {
  const { supabase } = useSupabase();
  
  return useQuery({
    queryKey: ['nonAdminInstallableProfiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('non_admin_installable_profiles')
        .select('profile_id');
      
      if (error) {
        throw new Error(`Error fetching non-admin installable profiles: ${error.message}`);
      }
      
      // Return an array of profile IDs
      return data.map(item => item.profile_id);
    },
  });
};

// Hook to check if a specific profile is installable by non-admins
export const useIsProfileNonAdminInstallable = (profileId: number | null) => {
  const { data: installableProfiles, isLoading, error } = useNonAdminInstallableProfiles();
  
  // If profileId is null or we're still loading, return false
  if (!profileId || isLoading) return false;
  
  // Check if the profile ID is in the list of installable profiles
  return installableProfiles?.includes(profileId) || false;
};

// Hook to toggle whether a profile is installable by non-admins
export const useToggleNonAdminInstallable = () => {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      profileId, 
      isInstallable 
    }: { 
      profileId: number; 
      isInstallable: boolean 
    }) => {
      if (isInstallable) {
        // Add the profile to non-admin installable profiles
        const { error } = await supabase
          .from('non_admin_installable_profiles')
          .upsert({ 
            profile_id: profileId, 
            created_by: (await supabase.auth.getUser()).data.user?.id 
          });
        
        if (error) {
          throw new Error(`Error making profile non-admin installable: ${error.message}`);
        }
      } else {
        // Remove the profile from non-admin installable profiles
        const { error } = await supabase
          .from('non_admin_installable_profiles')
          .delete()
          .eq('profile_id', profileId);
        
        if (error) {
          throw new Error(`Error removing profile from non-admin installable: ${error.message}`);
        }
      }
      
      return { success: true, isInstallable };
    },
    onSuccess: (_data, { isInstallable }) => {
      // Invalidate the query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['nonAdminInstallableProfiles'] });
      
      toast({
        title: isInstallable 
          ? "Profile now installable by non-admins" 
          : "Profile restricted to admin-only installation",
        description: isInstallable 
          ? "Non-admin users can now install this profile." 
          : "Only administrators can install this profile now.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Changing Permission",
        description: error.message || "Failed to update profile installation permissions.",
        variant: "destructive",
      });
    },
  });
};
