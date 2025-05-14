import { useCallback, useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase';

export const useIsAdmin = () => {
  const { supabase } = useSupabase();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const checkAdminStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get current user session
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        // User is not logged in
        setIsAdmin(false);
        return;
      }
      
      // Use our database function to check if the user is an admin
      const { data: isAdminResult, error: adminError } = await supabase.rpc('is_admin');
      
      if (adminError) {
        console.error('Error checking admin status:', adminError);
        setError(new Error(`Failed to check admin status: ${adminError.message}`));
        return;
      }
      
      setIsAdmin(!!isAdminResult);
      
    } catch (err) {
      console.error('Error in useIsAdmin hook:', err);
      setError(err instanceof Error ? err : new Error('Unknown error checking admin status'));
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    checkAdminStatus();
    
    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, checkAdminStatus]);

  return { isAdmin, isLoading, error, refresh: checkAdminStatus };
};
