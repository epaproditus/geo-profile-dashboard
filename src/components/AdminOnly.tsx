import { useEffect, useState } from 'react';
import { isCurrentUserAdmin } from '../lib/admin';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showAdminBadge?: boolean;
}

/**
 * Component that only renders its children if the current user is an admin
 * @param children - Content to show for admin users
 * @param fallback - Optional content to show for non-admin users (default: nothing)
 * @param showAdminBadge - Whether to show an admin badge (default: false)
 */
export const AdminOnly: React.FC<AdminOnlyProps> = ({ 
  children, 
  fallback = null,
  showAdminBadge = false 
}) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const adminStatus = await isCurrentUserAdmin();
      setIsAdmin(adminStatus);
    };

    checkAdminStatus();
  }, []);

  // While loading, render nothing
  if (isAdmin === null) {
    return null;
  }

  // If admin and showing badge, wrap with badge
  if (isAdmin && showAdminBadge) {
    return (
      <div className="relative">
        {children}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-amber-100">
                <ShieldCheck className="h-3 w-3 mr-1 text-amber-700" />
                <span className="text-xs text-amber-700">Admin</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">You have administrator privileges</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // If admin without badge, just render children
  if (isAdmin) {
    return <>{children}</>;
  }

  // If not admin, render the fallback
  return <>{fallback}</>;
};

/**
 * Indicator component to show admin status
 */
export const AdminStatusIndicator: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const adminStatus = await isCurrentUserAdmin();
      setIsAdmin(adminStatus);
    };

    checkAdminStatus();
  }, []);

  if (isAdmin === null) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center">
            {isAdmin ? (
              <>
                <ShieldCheck className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-xs text-green-600">Admin</span>
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 text-gray-400 mr-1" />
                <span className="text-xs text-gray-400">Standard User</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {isAdmin 
              ? "You have administrator privileges" 
              : "You have limited access. Contact an administrator for more permissions"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
