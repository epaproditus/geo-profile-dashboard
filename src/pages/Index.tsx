import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Check for authentication tokens in URL hash
    const handleAuthRedirect = async () => {
      const hash = window.location.hash;
      
      if (hash && hash.includes('access_token')) {
        try {
          console.log('Processing auth hash on Index page:', hash);
          
          // Extract tokens from the hash
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken) {
            console.log('Access token found, setting session');
            
            // Set the session with the tokens
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (sessionError) {
              console.error('Error setting session:', sessionError);
              navigate('/login');
              return;
            }
            
            // Set auth flag in localStorage
            localStorage.setItem('isAuthenticated', 'true');
            
            // Redirect to dashboard after successful authentication
            navigate('/dashboard', { replace: true });
            return;
          }
        } catch (err) {
          console.error('Auth redirect error:', err);
          navigate('/login');
          return;
        }
      }
      
      // If no auth tokens in URL, proceed with normal redirect logic
      setTimeout(() => {
        const isAuthenticated = localStorage.getItem("isAuthenticated");
        if (isAuthenticated) {
          navigate("/dashboard");
        } else {
          navigate("/login");
        }
        setIsLoading(false);
      }, 300);
    };
    
    handleAuthRedirect();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Redirecting...</div>
    </div>
  );
};

export default Index;
