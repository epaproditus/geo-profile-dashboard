import React from 'react';
import { AdminOnly } from '@/components/AdminOnly';
import { Button, ButtonProps } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * A button that is only enabled for admin users
 * Non-admin users will see a disabled button with a tooltip
 */
export const AdminActionButton: React.FC<ButtonProps> = (props) => {
  const { children, ...buttonProps } = props;
  
  // Content to show for non-admins
  const nonAdminFallback = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button {...buttonProps} disabled>
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="flex items-center">
            <ShieldX className="h-4 w-4 mr-1 text-red-500" />
            <span>Admin privileges required</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
  
  return (
    <AdminOnly fallback={nonAdminFallback}>
      <Button {...buttonProps}>
        {children}
      </Button>
    </AdminOnly>
  );
};

/**
 * Wraps any component to make it admin-only
 * For example form fields, edit buttons, or form submit buttons
 */
export const AdminAction: React.FC<{
  children: React.ReactNode;
  disabledPlaceholder?: React.ReactNode;
}> = ({ children, disabledPlaceholder }) => {
  // Default disabled content shows nothing
  const defaultDisabled = disabledPlaceholder || null;
  
  return (
    <AdminOnly fallback={defaultDisabled}>
      {children}
    </AdminOnly>
  );
};
