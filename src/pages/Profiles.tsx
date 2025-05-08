import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import AuthCheck from "@/components/AuthCheck";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, AlertTriangle, Loader2, FileText } from "lucide-react";
import { useAllProfiles, useDevices, useDownloadCustomConfigurationProfile } from "@/hooks/use-simplemdm";
import { SimpleMDMProfile, simplemdmApi } from "@/lib/api/simplemdm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

const Profiles = () => {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileContent, setProfileContent] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  
  const { toast } = useToast();
  
  // Fetch profiles from SimpleMDM
  const { data: profilesData, isLoading: isLoadingProfiles, error: profilesError } = useAllProfiles();
  
  // Get devices to count how many have each profile
  const { data: devicesData } = useDevices();
  
  // Hook for downloading custom configuration profiles
  const downloadProfile = useDownloadCustomConfigurationProfile();
  
  // Find the selected profile
  const selectedProfile = profilesData?.data?.find(p => p.id.toString() === selectedProfileId);
  
  // Check if a profile is a custom configuration profile
  const isCustomProfile = (profile: SimpleMDMProfile): boolean => {
    return simplemdmApi.isCustomConfigurationProfile(profile);
  };
  
  // Profile selection handler
  const handleProfileSelect = async (profileId: string) => {
    setSelectedProfileId(profileId);
    setProfileContent(null);
    
    // Get the profile
    const profile = profilesData?.data?.find(p => p.id.toString() === profileId);
    
    // If it's a custom profile, load the content automatically
    if (profile && isCustomProfile(profile)) {
      loadProfileContent(profileId);
    }
  };
  
  // Load profile content
  const loadProfileContent = async (profileId: string) => {
    setIsLoadingContent(true);
    try {
      const result = await downloadProfile.mutateAsync(profileId);
      
      if (result.error) {
        toast({
          title: "Download Failed",
          description: "Could not download profile content.",
          variant: "destructive",
        });
      } else if (result.data) {
        setProfileContent(result.data);
      }
    } catch (error) {
      console.error("Error downloading profile:", error);
    } finally {
      setIsLoadingContent(false);
    }
  };
  
  // Count devices using each profile
  const getDeviceCountForProfile = (profileId: number): number => {
    if (!devicesData?.data) return 0;
    
    // In a real implementation, we would check which devices have this profile installed
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
      case "custom_configuration_profile":
        return "Custom Configuration";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Copy profile content to clipboard
  const copyToClipboard = () => {
    if (profileContent) {
      navigator.clipboard.writeText(profileContent);
      toast({
        title: "Copied to clipboard",
        description: "Profile content has been copied to clipboard.",
      });
    }
  };

  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 container mx-auto p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Configuration Profiles</h1>
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
                      const isCustom = isCustomProfile(profile);
                      
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
                              <CardTitle className="text-lg font-semibold">
                                {profile.attributes?.name || "Unnamed Profile"}
                                {isCustom && (
                                  <Badge variant="secondary" className="ml-2">Custom</Badge>
                                )}
                              </CardTitle>
                              <Badge variant="outline" className="bg-primary/10 text-primary">
                                {deviceCount} device{deviceCount !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <CardDescription>
                              {profile.attributes?.description || 
                               `${getProfileTypeDisplay(profile.type)} Profile`}
                            </CardDescription>
                          </CardHeader>
                          <CardFooter className="pt-1">
                            <Badge variant="secondary">
                              {getProfileTypeDisplay(profile.type)}
                            </Badge>
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
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>{selectedProfile.attributes?.name || "Unnamed Profile"}</CardTitle>
                        <Badge variant="outline" className="px-2 py-1">
                          {getProfileTypeDisplay(selectedProfile.type)}
                        </Badge>
                      </div>
                      {selectedProfile.attributes?.description && (
                        <CardDescription>
                          {selectedProfile.attributes.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col">
                      {isCustomProfile(selectedProfile) ? (
                        <div className="flex flex-col flex-1">
                          {isLoadingContent || downloadProfile.isPending ? (
                            <div className="flex justify-center items-center my-12">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              <span className="ml-2">Loading profile content...</span>
                            </div>
                          ) : profileContent ? (
                            <div className="flex-1 flex flex-col">
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-medium">Profile Content</h3>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={copyToClipboard}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Copy to Clipboard
                                </Button>
                              </div>
                              <ScrollArea className="flex-1 border rounded">
                                <pre className="p-4 text-xs font-mono whitespace-pre-wrap overflow-auto">
                                  {profileContent}
                                </pre>
                              </ScrollArea>
                            </div>
                          ) : (
                            <div className="flex justify-center items-center my-12">
                              <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                              <span className="ml-2">Failed to load profile content.</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12">
                          <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground text-center">
                            This is not a custom configuration profile. Content is not available.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-6 min-h-[300px]">
                      <ScrollText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Profile Selected</h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        Select a profile from the list to view its details.
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
