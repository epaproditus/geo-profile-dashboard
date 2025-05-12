import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../lib/supabase';
import { isCurrentUserAdmin } from '../lib/admin';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface AuthCheckProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const AuthCheck: React.FC<AuthCheckProps> = ({ children, requireAdmin = false }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const user = await getCurrentUser();
        
        if (!user) {
          // Not authenticated, redirect to login
          navigate('/login');
          return;
        }
        
        // User is authenticated
        setIsAuthenticated(true);
        
        // Check admin status if required
        if (requireAdmin) {
          const adminStatus = await isCurrentUserAdmin();
          setIsAdmin(adminStatus);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        // On error, redirect to login as a fallback
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate, requireAdmin]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Verifying authentication...</span>
      </div>
    );
  }

  // If admin is required but user is not an admin
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You need administrator privileges to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Only render children if authenticated (and admin if required)
  return isAuthenticated ? <>{children}</> : null;
};

export default AuthCheck;
