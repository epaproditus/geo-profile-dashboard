import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDevices, useAllProfiles, usePushProfileToDevice } from "@/hooks/use-simplemdm";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SimpleMDMProfile } from "@/lib/api/simplemdm";
import { format, parseISO, formatDistance } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";

// Type for quick profile assignments
interface QuickProfileAssignment {
  id: number;
  profile_id: number;
  device_id: number;
  install_at: string;
  remove_at: string;
  status: 'scheduled' | 'installed' | 'removed' | 'failed';
  created_at: string;
  updated_at: string;
}

// Durations in minutes - can be customized
const DURATIONS = [
  { value: 10, label: "10 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
  { value: 480, label: "8 hours" },
  { value: 1440, label: "1 day" },
];

const QuickProfileScheduler: React.FC = () => {
  // State
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [assignments, setAssignments] = useState<QuickProfileAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState<string>("schedule");
  const [fetchingAssignments, setFetchingAssignments] = useState<boolean>(false);
  
  // API hooks
  const { data: devicesData, isLoading: isLoadingDevices } = useDevices();
  const { data: profilesData, isLoading: isLoadingProfiles } = useAllProfiles();
  const { toast } = useToast();
  const pushProfile = usePushProfileToDevice();
  
  // Filter to only include the two specific profiles
  const allowedProfileIds = ["173535", "173628"];
  const allowedProfiles = profilesData?.data?.filter(profile => 
    allowedProfileIds.includes(profile.id.toString())
  ) || [];
  
  // Load existing assignments on component mount
  useEffect(() => {
    fetchAssignments();
  }, []);
  
  // Function to fetch assignments
  const fetchAssignments = async () => {
    setFetchingAssignments(true);
    try {
      const { data, error } = await supabase.rpc('get_quick_profile_assignments');
      
      if (error) throw error;
      
      setAssignments(data || []);
    } catch (err) {
      console.error("Error fetching quick profile assignments:", err);
      toast({
        title: "Failed to load assignments",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setFetchingAssignments(false);
    }
  };
  
  // Function to schedule a profile
  const scheduleProfile = async () => {
    if (!selectedProfileId || !selectedDeviceId || !durationMinutes) {
      toast({
        title: "Missing information",
        description: "Please select a profile, device, and duration.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Create assignment in database
      const { data, error } = await supabase.rpc(
        'create_quick_profile_assignment',
        {
          _profile_id: parseInt(selectedProfileId),
          _device_id: parseInt(selectedDeviceId),
          _duration_minutes: durationMinutes
        }
      );
      
      if (error) throw error;
      
      // Push profile to device using existing API
      await pushProfile.mutateAsync({
        profileId: selectedProfileId,
        deviceId: selectedDeviceId
      });
      
      // Update assignment status to 'installed'
      await supabase
        .from('quick_profile_assignments')
        .update({ status: 'installed' })
        .eq('id', data);
      
      // Refresh assignments
      await fetchAssignments();
      
      // Reset form
      setSelectedProfileId("");
      setSelectedDeviceId("");
      
      // Show success toast
      toast({
        title: "Profile scheduled successfully",
        description: `Profile will be automatically removed after ${durationMinutes} minutes.`,
      });
      
      // Switch to history tab
      setTabValue("history");
      
    } catch (err) {
      console.error("Error scheduling profile:", err);
      toast({
        title: "Failed to schedule profile",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to cancel an assignment
  const cancelAssignment = async (assignmentId: number) => {
    if (!confirm("Are you sure you want to cancel this assignment?")) {
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc(
        'cancel_quick_profile_assignment',
        { _assignment_id: assignmentId }
      );
      
      if (error) throw error;
      
      // Refresh assignments
      await fetchAssignments();
      
      toast({
        title: "Assignment cancelled",
        description: "The profile assignment has been cancelled.",
      });
    } catch (err) {
      console.error("Error cancelling assignment:", err);
      toast({
        title: "Failed to cancel assignment",
        description: err.message,
        variant: "destructive",
      });
    }
  };
  
  // Get profile and device names by ID
  const getProfileName = (profileId: number) => {
    const profile = profilesData?.data?.find(p => p.id === profileId);
    return profile?.attributes?.name || "Unknown Profile";
  };
  
  const getDeviceName = (deviceId: number) => {
    const device = devicesData?.data?.find(d => d.id === deviceId);
    return device?.attributes?.name || `Device ${deviceId}`;
  };
  
  // Format statuses for display
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'installed':
        return <Badge variant="success">Installed</Badge>;
      case 'removed':
        return <Badge variant="outline">Removed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Sort assignments by date (newest first)
  const sortedAssignments = [...(assignments || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  // Filter active assignments (scheduled or installed)
  const activeAssignments = sortedAssignments.filter(
    a => a.status === 'scheduled' || a.status === 'installed'
  );
  
  // Filter completed assignments (removed or failed)
  const completedAssignments = sortedAssignments.filter(
    a => a.status === 'removed' || a.status === 'failed'
  );

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Quick Profile Scheduler</h1>
      
      <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedule">Schedule Profile</TabsTrigger>
          <TabsTrigger value="history">Assignment History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Profile Installation</CardTitle>
              <CardDescription>
                Temporarily install a profile on a device. The profile will be automatically removed after the specified duration.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Allowed Profiles Notice */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Only specific profiles can be scheduled for temporary installation.
                </AlertDescription>
              </Alert>
              
              {/* Profile Selection */}
              <div className="space-y-2">
                <Label htmlFor="profile-select">Configuration Profile</Label>
                <Select 
                  value={selectedProfileId} 
                  onValueChange={setSelectedProfileId}
                  disabled={isLoadingProfiles}
                >
                  <SelectTrigger id="profile-select" className="w-full">
                    <SelectValue placeholder="Select a profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingProfiles ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading profiles...
                      </div>
                    ) : allowedProfiles.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No allowed profiles found
                      </div>
                    ) : (
                      allowedProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id.toString()}>
                          {profile.attributes.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Device Selection */}
              <div className="space-y-2">
                <Label htmlFor="device-select">Device</Label>
                <Select 
                  value={selectedDeviceId} 
                  onValueChange={setSelectedDeviceId}
                  disabled={isLoadingDevices}
                >
                  <SelectTrigger id="device-select" className="w-full">
                    <SelectValue placeholder="Select a device" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingDevices ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading devices...
                      </div>
                    ) : !devicesData?.data || devicesData.data.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No devices found
                      </div>
                    ) : (
                      <ScrollArea className="h-[200px]">
                        {devicesData.data.map((device) => (
                          <SelectItem key={device.id} value={device.id.toString()}>
                            {device.attributes.name || `Device ${device.id}`}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Duration Selection */}
              <div className="space-y-2">
                <Label>Duration</Label>
                <RadioGroup 
                  value={durationMinutes.toString()} 
                  onValueChange={(value) => setDurationMinutes(parseInt(value))}
                  className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
                >
                  {DURATIONS.map((duration) => (
                    <div key={duration.value} className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={duration.value.toString()} 
                        id={`duration-${duration.value}`} 
                      />
                      <Label htmlFor={`duration-${duration.value}`} className="cursor-pointer">
                        {duration.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              
              {/* Active Assignments */}
              {activeAssignments.length > 0 && (
                <div className="space-y-2 mt-4 border-t pt-4">
                  <h3 className="font-medium">Active Assignments</h3>
                  <div className="space-y-2">
                    {activeAssignments.map((assignment) => (
                      <div 
                        key={assignment.id} 
                        className="border rounded-md p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex items-center">
                            <span className="font-medium">{getProfileName(assignment.profile_id)}</span>
                            <span className="mx-2">→</span>
                            <span>{getDeviceName(assignment.device_id)}</span>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            Will be removed at {format(parseISO(assignment.remove_at), "PPp")}
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-0 flex items-center">
                          {getStatusBadge(assignment.status)}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="ml-2"
                            onClick={() => cancelAssignment(assignment.id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter>
              <Button 
                onClick={scheduleProfile} 
                disabled={!selectedProfileId || !selectedDeviceId || loading}
                className="w-full"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Schedule Temporary Profile
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignment History</CardTitle>
              <CardDescription>
                History of temporary profile assignments
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {fetchingAssignments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : sortedAssignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No assignment history found
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Active Assignments Section */}
                  {activeAssignments.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Active Assignments</h3>
                      <div className="space-y-2">
                        {activeAssignments.map((assignment) => (
                          <div 
                            key={assignment.id} 
                            className="border rounded-md p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{getProfileName(assignment.profile_id)}</div>
                              {getStatusBadge(assignment.status)}
                            </div>
                            
                            <div className="mt-1">Device: {getDeviceName(assignment.device_id)}</div>
                            
                            <div className="flex items-center text-sm text-muted-foreground mt-2">
                              <div className="flex items-center mr-3">
                                <Clock className="h-3 w-3 mr-1" />
                                Installed: {format(parseISO(assignment.install_at), "PPp")}
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Removes: {format(parseISO(assignment.remove_at), "PPp")}
                              </div>
                            </div>
                            
                            <div className="mt-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => cancelAssignment(assignment.id)}
                              >
                                Cancel Assignment
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Completed Assignments Section */}
                  {completedAssignments.length > 0 && (
                    <div className={activeAssignments.length > 0 ? "border-t pt-4 mt-4" : ""}>
                      <h3 className="font-medium mb-2">Completed Assignments</h3>
                      <div className="space-y-2">
                        {completedAssignments.map((assignment) => (
                          <div 
                            key={assignment.id} 
                            className="border rounded-md p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{getProfileName(assignment.profile_id)}</div>
                              {getStatusBadge(assignment.status)}
                            </div>
                            
                            <div className="mt-1">Device: {getDeviceName(assignment.device_id)}</div>
                            
                            <div className="flex items-center text-sm text-muted-foreground mt-2">
                              <div className="flex items-center mr-3">
                                <Clock className="h-3 w-3 mr-1" />
                                Installed: {format(parseISO(assignment.install_at), "PPp")}
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                Removed: {
                                  assignment.status === 'removed' 
                                    ? formatDistance(parseISO(assignment.updated_at), new Date(), { addSuffix: true })
                                    : format(parseISO(assignment.remove_at), "PPp")
                                }
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuickProfileScheduler;
