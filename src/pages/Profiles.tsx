import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import AuthCheck from "@/components/AuthCheck";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ScrollText, Settings, Smartphone, Trash, AlertTriangle, Loader2 } from "lucide-react";
import { useAllProfiles, useDevice, useDevices } from "@/hooks/use-simplemdm";
import { SimpleMDMProfile } from "@/lib/api/simplemdm";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Profiles = () => {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { toast } = useToast();
  
  // Fetch profiles from SimpleMDM
  const { data: profilesData, isLoading: isLoadingProfiles, error: profilesError } = useAllProfiles();
  
  // Get devices to count how many have each profile
  const { data: devicesData } = useDevices();
  
  // Profile selection handler
  const handleProfileSelect = (profileId: string) => {
    setSelectedProfileId(profileId);
  };

  // Find the selected profile
  const selectedProfile = profilesData?.data?.find(p => p.id.toString() === selectedProfileId);
  
  // Count devices using each profile
  const getDeviceCountForProfile = (profileId: number): number => {
    if (!devicesData?.data) return 0;
    
    // In a real implementation, we would check which devices have this profile installed
    // This is a placeholder - you would need to implement the actual logic based on your API
    return devicesData.data.filter(device => 
      device.relationships?.custom_attribute_values?.data.some(attr => 
        attr.id === "profile_id" && attr.attributes.value === profileId.toString()
      )
    ).length;
  };
  
  // Get profile type display name
  const getProfileTypeDisplay = (type: string | undefined): string => {
    if (!type) return "Unknown";
    
    switch (type) {
      case "configuration":
        return "Configuration";
      case "enrollment":
        return "Enrollment";
      case "supervision":
        return "Supervision";
      case "trust":
        return "Trust";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 container mx-auto p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Configuration Profiles</h1>
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              New Profile
            </Button>
          </div>
          
          {profilesError && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Error loading profiles. Please check your connection and try again.
              </AlertDescription>
            </Alert>
          )}
          
          {isLoadingProfiles ? (
            <div className="flex justify-center items-center my-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading profiles...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                {profilesData?.data ? (
                  profilesData.data.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center p-6">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground text-center">No profiles found in SimpleMDM.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    profilesData.data.map((profile) => {
                      const deviceCount = getDeviceCountForProfile(profile.id);
                      return (
                        <Card 
                          key={profile.id}
                          className={`cursor-pointer transition-all ${
                            selectedProfileId === profile.id.toString() 
                              ? 'ring-2 ring-primary' 
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleProfileSelect(profile.id.toString())}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg font-semibold">{profile.attributes?.name || "Unnamed Profile"}</CardTitle>
                              <Badge variant="outline" className="bg-primary/10 text-primary">
                                {deviceCount} device{deviceCount !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <CardDescription>
                              {profile.attributes?.description || 
                               `${getProfileTypeDisplay(profile.attributes?.profile_type)} Profile`}
                            </CardDescription>
                          </CardHeader>
                          <CardFooter className="pt-1">
                            <div className="flex justify-between items-center w-full">
                              <div className="flex gap-2">
                                <Badge variant="secondary">
                                  {getProfileTypeDisplay(profile.attributes?.profile_type)}
                                </Badge>
                                <Badge variant={profile.attributes?.status === "uploaded" ? "default" : "outline"}>
                                  {profile.attributes?.status || "Unknown"}
                                </Badge>
                              </div>
                            </div>
                          </CardFooter>
                        </Card>
                      );
                    })
                  )
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-6">
                      <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-center">No profile data available.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              <div className="md:col-span-2">
                {selectedProfile ? (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>{selectedProfile.attributes?.name || "Unnamed Profile"}</CardTitle>
                        <Badge variant="outline" className="px-2 py-1">
                          <Settings className="h-3.5 w-3.5 mr-1" />
                          {getProfileTypeDisplay(selectedProfile.attributes?.profile_type)}
                        </Badge>
                      </div>
                      <CardDescription>
                        {selectedProfile.attributes?.description || 
                         `${getProfileTypeDisplay(selectedProfile.attributes?.profile_type)} Profile`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">Profile Details</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                              <span>Profile Type</span>
                              <Badge variant="secondary">
                                {getProfileTypeDisplay(selectedProfile.attributes?.profile_type)}
                              </Badge>
                            </div>
                            <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                              <span>Status</span>
                              <Badge variant={selectedProfile.attributes?.status === "uploaded" ? "default" : "outline"}>
                                {selectedProfile.attributes?.status || "Unknown"}
                              </Badge>
                            </div>
                            <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                              <span>Created</span>
                              <span className="font-medium">
                                {selectedProfile.attributes?.created_at 
                                  ? new Date(selectedProfile.attributes.created_at).toLocaleDateString() 
                                  : "Unknown"}
                              </span>
                            </div>
                            <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                              <span>Updated</span>
                              <span className="font-medium">
                                {selectedProfile.attributes?.updated_at 
                                  ? new Date(selectedProfile.attributes.updated_at).toLocaleDateString() 
                                  : "Unknown"}
                              </span>
                            </div>
                            <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                              <span>Has Settings</span>
                              <Badge variant={selectedProfile.attributes?.has_settings ? "default" : "outline"}>
                                {selectedProfile.attributes?.has_settings ? "Yes" : "No"}
                              </Badge>
                            </div>
                            <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                              <span>Has Config Options</span>
                              <Badge variant={selectedProfile.attributes?.has_config_options ? "default" : "outline"}>
                                {selectedProfile.attributes?.has_config_options ? "Yes" : "No"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        {/* Custom attributes section */}
                        {selectedProfile.attributes?.custom_attributes && (
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">Custom Attributes</h3>
                            <div className="border rounded-md p-4">
                              {selectedProfile.attributes.custom_attributes.isDefault && (
                                <div className="mb-2 flex items-center">
                                  <Badge variant="default" className="mr-2">Default Profile</Badge>
                                </div>
                              )}
                              
                              {selectedProfile.attributes.custom_attributes.associatedGeofences && 
                               selectedProfile.attributes.custom_attributes.associatedGeofences.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Associated Geofences</h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {selectedProfile.attributes.custom_attributes.associatedGeofences.map(geofence => (
                                      <div key={geofence.id} className="border rounded p-2 text-sm">
                                        {geofence.name}
                                        {geofence.address && <div className="text-xs text-muted-foreground">{geofence.address}</div>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-6 min-h-[300px]">
                      <ScrollText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Profile Selected</h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        Select a profile from the list to view its configuration details.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthCheck>
  );
};

export default Profiles;
