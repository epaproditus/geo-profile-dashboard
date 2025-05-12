import { useState, useEffect } from 'react';
import { getUsersWithAdminStatus, setUserAdminStatus } from '@/lib/admin';
import { Loader2, UserCog, Users, Shield, ShieldCheck, ShieldX } from 'lucide-react';
import AuthCheck from '@/components/AuthCheck';
import { AdminStatusIndicator } from '@/components/AdminOnly';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

const AdminPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { data, error } = await getUsersWithAdminStatus();
        
        if (error) {
          setError('Failed to load users. You may not have administrator permissions.');
        } else {
          setUsers(data || []);
        }
      } catch (e) {
        setError('An unexpected error occurred');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleAdminToggle = async (userId: string, currentStatus: boolean) => {
    try {
      // Optimistically update the UI
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_admin: !currentStatus }
          : user
      ));
      
      // Call the API to update the status
      const { success, error } = await setUserAdminStatus(userId, !currentStatus);
      
      if (!success) {
        // Revert the change if it failed
        setUsers(users.map(user => 
          user.id === userId 
            ? { ...user, is_admin: currentStatus }
            : user
        ));
        
        toast({
          title: "Failed to update admin status",
          description: error?.message || "An error occurred",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Admin status updated",
          description: `User is now ${!currentStatus ? 'an admin' : 'a standard user'}`,
          duration: 3000
        });
      }
    } catch (e) {
      console.error('Error toggling admin status:', e);
      // Revert the change if there was an exception
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_admin: currentStatus }
          : user
      ));
      
      toast({
        title: "Error updating admin status",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <AuthCheck requireAdmin>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage user access and permissions</p>
          </div>
          <AdminStatusIndicator />
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <UserCog className="mr-2 h-5 w-5" />
              Admin Actions
            </CardTitle>
            <CardDescription>
              Admin users have full access to create, edit, and delete content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Use the toggles below to grant or revoke administrator privileges to users.
              Admin users can:
            </p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground mb-4 space-y-1">
              <li>Create, edit, and delete all content</li>
              <li>Manage other users' permissions</li>
              <li>Access all administrative functions</li>
            </ul>
            <Alert className="mb-2">
              <AlertDescription className="text-xs">
                Be careful when revoking your own admin status as you may not be able to regain it.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading users...</span>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                User List
              </CardTitle>
              <CardDescription>
                {users.length} user{users.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex flex-col space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium flex items-center">
                          {user.email}
                          {user.is_admin && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          User since {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`admin-status-${user.id}`} className="flex items-center">
                          {user.is_admin ? (
                            <ShieldCheck className="h-4 w-4 mr-1 text-amber-600" />
                          ) : (
                            <Shield className="h-4 w-4 mr-1 text-muted-foreground" />
                          )}
                          <span>{user.is_admin ? 'Admin' : 'Standard'}</span>
                        </Label>
                        <Switch
                          id={`admin-status-${user.id}`}
                          checked={user.is_admin}
                          onCheckedChange={() => handleAdminToggle(user.id, user.is_admin)}
                        />
                      </div>
                    </div>
                    <Separator />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthCheck>
  );
};

export default AdminPage;
