import { useState, useEffect } from "react";
import AuthCheck from "@/components/AuthCheck";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Clock, XCircle, Check, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { format, formatDistance } from "date-fns";
import { useAllProfiles, useDevices } from "@/hooks/use-simplemdm";

// Fixed profile IDs that standard users are allowed to push
const ALLOWED_PROFILE_IDS = ["173535", "173628"];

// Main component
const QuickProfiles = () => {
  const { toast } = useToast();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  // State for form inputs
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(10);
  
  // State for API operations
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickProfiles, setQuickProfiles] = useState([]);
  const [error, setError] = useState(null);
  
  // Fetch all profiles and devices
  const { data: profilesData, isLoading: isLoadingProfiles } = useAllProfiles();
  const { data: devicesData, isLoading: isLoadingDevices } = useDevices();
  
  // Filter allowed profiles
  const allowedProfiles = profilesData?.data?.filter(
    profile => ALLOWED_PROFILE_IDS.includes(profile.id.toString())
  ) || [];
  
  // Load quick profile assignments
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
        fetchQuickProfiles(session.access_token);
      }
    };
    
    getSession();
  }, []);
  
  // Fetch quick profile assignments for the current user
  const fetchQuickProfiles = async (token = accessToken) => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/quick-profiles", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch quick profiles");
      }
      
      const data = await response.json();
      setQuickProfiles(data.data || []);
    } catch (err) {
      setError(err.message);
      toast({
        title: "Error",
        description: `Failed to load quick profiles: ${err.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProfileId || !selectedDeviceId || !accessToken) {
      toast({
        title: "Validation Error",
        description: "Please select both a profile and a device",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/quick-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          profileId: selectedProfileId,
          deviceId: selectedDeviceId,
          durationMinutes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to schedule profile");
      }
      
      toast({
        title: "Success",
        description: "Profile has been scheduled and pushed to the device",
        variant: "default"
      });
      
      // Reset form
      setSelectedProfileId("");
      setSelectedDeviceId("");
      setDurationMinutes(10);
      
      // Refresh the list
      fetchQuickProfiles();
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to schedule profile: ${err.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle assignment cancellation
  const handleCancelAssignment = async (assignmentId) => {
    if (!accessToken) return;
    
    try {
      const response = await fetch(`/api/quick-profiles?assignmentId=${assignmentId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel assignment");
      }
      
      toast({
        title: "Success",
        description: "Profile assignment has been canceled",
        variant: "default"
      });
      
      // Refresh the list
      fetchQuickProfiles();
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to cancel assignment: ${err.message}`,
        variant: "destructive"
      });
    }
  };
  
  // Get badge variant based on status
  const getStatusBadge = (status) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>;
      case "installed":
        return <Badge className="bg-green-500 text-white">Installed</Badge>;
      case "removed":
        return <Badge variant="outline">Removed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 container mx-auto p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Quick Profile Scheduler</h1>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile selection form */}
            <Card className="md:col-span-1">
              <form onSubmit={handleSubmit}>
                <CardHeader>
                  <CardTitle>Schedule a Profile</CardTitle>
                  <CardDescription>
                    Select a profile to push to a device for a limited time
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Profile selector */}
                  <div className="space-y-2">
                    <Label htmlFor="profile">Select Profile</Label>
                    <Select
                      value={selectedProfileId}
                      onValueChange={setSelectedProfileId}
                      disabled={isLoadingProfiles || isSubmitting}
                    >
                      <SelectTrigger id="profile">
                        <SelectValue placeholder="Select a profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingProfiles ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="ml-2">Loading profiles...</span>
                          </div>
                        ) : allowedProfiles.length > 0 ? (
                          allowedProfiles.map(profile => (
                            <SelectItem 
                              key={profile.id} 
                              value={profile.id.toString()}
                            >
                              {profile.attributes.name} (ID: {profile.id})
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-muted-foreground">
                            No allowed profiles found
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Device selector */}
                  <div className="space-y-2">
                    <Label htmlFor="device">Select Device</Label>
                    <Select
                      value={selectedDeviceId}
                      onValueChange={setSelectedDeviceId}
                      disabled={isLoadingDevices || isSubmitting}
                    >
                      <SelectTrigger id="device">
                        <SelectValue placeholder="Select a device" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingDevices ? (
                          <div className="flex items-center justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="ml-2">Loading devices...</span>
                          </div>
                        ) : devicesData?.data?.length > 0 ? (
                          devicesData.data.map(device => (
                            <SelectItem 
                              key={device.id} 
                              value={device.id.toString()}
                            >
                              {device.attributes.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-muted-foreground">
                            No devices found
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Duration slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <span className="text-sm text-muted-foreground">
                        {durationMinutes} min
                      </span>
                    </div>
                    <Slider
                      id="duration"
                      value={[durationMinutes]}
                      onValueChange={([value]) => setDurationMinutes(value)}
                      min={1}
                      max={60}
                      step={1}
                      disabled={isSubmitting}
                    />
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={!selectedProfileId || !selectedDeviceId || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      "Schedule Installation"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
            
            {/* Active assignments */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Active Assignments</CardTitle>
                <CardDescription>
                  Profiles that have been scheduled for temporary installation
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center p-6">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading assignments...</span>
                  </div>
                ) : quickProfiles.length > 0 ? (
                  <div className="space-y-4">
                    {quickProfiles.map(assignment => (
                      <Card key={assignment.id} className="overflow-hidden">
                        <div className="flex flex-col md:flex-row">
                          <div className="flex-1 p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold">
                                  {assignment.profile?.name || `Profile ${assignment.profile_id}`}
                                </h3>
                                <p className="text-sm text-muted-foreground">ID: {assignment.profile_id}</p>
                              </div>
                              {getStatusBadge(assignment.status)}
                            </div>
                            
                            <div className="mt-2">
                              <p className="text-sm">
                                <span className="font-medium">Device:</span>{" "}
                                {assignment.device?.name || `Device ${assignment.device_id}`}
                              </p>
                              
                              <div className="flex flex-col mt-2 space-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center">
                                  <Calendar className="h-3.5 w-3.5 mr-1" />
                                  <span>Installed: {format(new Date(assignment.install_at), "MMM d, yyyy h:mm a")}</span>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-3.5 w-3.5 mr-1" />
                                  <span>Will be removed: {format(new Date(assignment.remove_at), "MMM d, yyyy h:mm a")}</span>
                                </div>
                                <div className="flex items-center">
                                  <span>Duration: {formatDistance(new Date(assignment.remove_at), new Date(assignment.install_at))}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-muted p-4 flex items-center justify-center">
                            {assignment.status === 'scheduled' || assignment.status === 'installed' ? (
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleCancelAssignment(assignment.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            ) : (
                              <div className="text-sm text-muted-foreground text-center px-4">
                                {assignment.status === 'removed' ? 'Removed' : 'Failed'}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-1">No active assignments</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      When you schedule profiles, they will appear here. Profiles will be automatically removed
                      after the specified duration.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthCheck>
  );
};

export default QuickProfiles;
