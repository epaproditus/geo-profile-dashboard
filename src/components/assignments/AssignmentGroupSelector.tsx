import React, { useState } from 'react';
import { useAssignmentGroups, usePushAppsToAssignmentGroup } from '@/hooks/use-simplemdm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppWindow, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface AssignmentGroupSelectorProps {
  deviceId?: number | string;
}

const AssignmentGroupSelector: React.FC<AssignmentGroupSelectorProps> = ({ deviceId }) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const { data: assignmentGroups, isLoading: isLoadingGroups } = useAssignmentGroups({ limit: 50 });
  const pushApps = usePushAppsToAssignmentGroup();

  const handlePushApps = () => {
    if (selectedGroupId) {
      pushApps.mutate(selectedGroupId);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AppWindow className="h-5 w-5" />
          Install Apps
        </CardTitle>
        <CardDescription>
          Push apps to devices using assignment groups
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingGroups ? (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : assignmentGroups?.data && assignmentGroups.data.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="assignment-group" className="text-sm font-medium">
                Select an assignment group
              </label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger id="assignment-group">
                  <SelectValue placeholder="Select an assignment group" />
                </SelectTrigger>
                <SelectContent>
                  {assignmentGroups.data.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.attributes.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedGroupId && (
              <div className="border rounded-md p-3 bg-muted/30">
                <h4 className="font-medium mb-2">Assignment Group Details</h4>
                {assignmentGroups.data.map((group) => {
                  if (group.id.toString() === selectedGroupId) {
                    const appCount = group.relationships.apps.data.length;
                    const deviceCount = group.relationships.devices.data.length;
                    const deviceGroupCount = group.relationships.device_groups.data.length;
                    
                    return (
                      <div key={group.id} className="text-sm grid grid-cols-2 gap-2">
                        <span className="text-muted-foreground">Name:</span>
                        <span>{group.attributes.name}</span>
                        
                        <span className="text-muted-foreground">Apps:</span>
                        <span>{appCount} app{appCount !== 1 ? 's' : ''}</span>
                        
                        <span className="text-muted-foreground">Devices:</span>
                        <span>{deviceCount} device{deviceCount !== 1 ? 's' : ''}</span>
                        
                        <span className="text-muted-foreground">Device Groups:</span>
                        <span>{deviceGroupCount} group{deviceGroupCount !== 1 ? 's' : ''}</span>
                        
                        <span className="text-muted-foreground">Last Updated:</span>
                        <span>{formatDate(group.attributes.updated_at)}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No assignment groups found. Create assignment groups in SimpleMDM to push apps to devices.
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full"
          disabled={!selectedGroupId || pushApps.isPending}
          onClick={handlePushApps}
        >
          {pushApps.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Installing Apps...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Install Apps
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AssignmentGroupSelector;