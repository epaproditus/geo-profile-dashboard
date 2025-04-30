
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
import { Plus, ScrollText, Settings, Smartphone, Trash } from "lucide-react";

// Mock data
const initialProfiles = [
  { 
    id: "profile1", 
    name: "Standard Security", 
    description: "Basic security settings for general use",
    deviceCount: 2,
    settings: {
      cameraBlocked: false,
      screenLockRequired: true,
      wifiRestricted: false,
      appInstallRestricted: false,
      autolockTimeout: 5,
      vpnRequired: false
    }
  },
  { 
    id: "profile2", 
    name: "High Security", 
    description: "Enhanced security with strict policies for sensitive data",
    deviceCount: 1,
    settings: {
      cameraBlocked: true,
      screenLockRequired: true,
      wifiRestricted: true,
      appInstallRestricted: true,
      autolockTimeout: 2,
      vpnRequired: true
    }
  },
  { 
    id: "profile3", 
    name: "Development", 
    description: "Relaxed settings for development devices",
    deviceCount: 1,
    settings: {
      cameraBlocked: false,
      screenLockRequired: false,
      wifiRestricted: false,
      appInstallRestricted: false,
      autolockTimeout: 30,
      vpnRequired: false
    }
  },
];

interface ProfileFormData {
  name: string;
  description: string;
  cameraBlocked: boolean;
  screenLockRequired: boolean;
  wifiRestricted: boolean;
  appInstallRestricted: boolean;
  autolockTimeout: number;
  vpnRequired: boolean;
}

const Profiles = () => {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(profiles[0].id);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    description: "",
    cameraBlocked: false,
    screenLockRequired: true,
    wifiRestricted: false,
    appInstallRestricted: false,
    autolockTimeout: 5,
    vpnRequired: false
  });
  
  const { toast } = useToast();

  const handleCreateProfile = () => {
    const newProfile = {
      id: `profile${Date.now()}`,
      name: formData.name,
      description: formData.description,
      deviceCount: 0,
      settings: {
        cameraBlocked: formData.cameraBlocked,
        screenLockRequired: formData.screenLockRequired,
        wifiRestricted: formData.wifiRestricted,
        appInstallRestricted: formData.appInstallRestricted,
        autolockTimeout: formData.autolockTimeout,
        vpnRequired: formData.vpnRequired
      }
    };
    
    setProfiles([...profiles, newProfile]);
    toast({
      title: "Profile Created",
      description: `"${formData.name}" has been created successfully.`
    });
    
    // Reset form
    setFormData({
      name: "",
      description: "",
      cameraBlocked: false,
      screenLockRequired: true,
      wifiRestricted: false,
      appInstallRestricted: false,
      autolockTimeout: 5,
      vpnRequired: false
    });
    setIsDialogOpen(false);
  };

  const handleDeleteProfile = (profileId: string) => {
    setProfiles(profiles.filter(p => p.id !== profileId));
    if (selectedProfile === profileId) {
      setSelectedProfile(profiles[0]?.id || null);
    }
    toast({
      title: "Profile Deleted",
      description: "The configuration profile has been removed."
    });
  };

  const currentProfile = profiles.find(p => p.id === selectedProfile);

  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 container mx-auto p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Configuration Profiles</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Create New Profile</DialogTitle>
                  <DialogDescription>
                    Create a new device configuration profile for your geofences.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Name</Label>
                    <Input 
                      id="profile-name" 
                      placeholder="e.g., Office Security Profile"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="profile-description">Description</Label>
                    <Textarea 
                      id="profile-description" 
                      placeholder="Describe what this profile does..."
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                  
                  <Separator className="my-2" />
                  <h4 className="font-medium">Security Settings</h4>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="camera-blocked">Block Camera</Label>
                      <Switch 
                        id="camera-blocked" 
                        checked={formData.cameraBlocked}
                        onCheckedChange={(checked) => setFormData({...formData, cameraBlocked: checked})}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <Label htmlFor="screen-lock">Require Screen Lock</Label>
                      <Switch 
                        id="screen-lock" 
                        checked={formData.screenLockRequired}
                        onCheckedChange={(checked) => setFormData({...formData, screenLockRequired: checked})}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <Label htmlFor="wifi-restricted">Restrict Wi-Fi Networks</Label>
                      <Switch 
                        id="wifi-restricted" 
                        checked={formData.wifiRestricted}
                        onCheckedChange={(checked) => setFormData({...formData, wifiRestricted: checked})}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <Label htmlFor="app-install">Restrict App Installation</Label>
                      <Switch 
                        id="app-install" 
                        checked={formData.appInstallRestricted}
                        onCheckedChange={(checked) => setFormData({...formData, appInstallRestricted: checked})}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <Label htmlFor="vpn-required">Require VPN</Label>
                      <Switch 
                        id="vpn-required" 
                        checked={formData.vpnRequired}
                        onCheckedChange={(checked) => setFormData({...formData, vpnRequired: checked})}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <Label htmlFor="autolock-timeout">Auto-Lock Timeout (minutes)</Label>
                      <Input 
                        id="autolock-timeout" 
                        type="number" 
                        className="w-20" 
                        value={formData.autolockTimeout}
                        onChange={(e) => setFormData({...formData, autolockTimeout: parseInt(e.target.value) || 5})}
                      />
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateProfile}
                    disabled={!formData.name}
                  >
                    Create Profile
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              {profiles.map((profile) => (
                <Card 
                  key={profile.id}
                  className={`cursor-pointer transition-all ${
                    selectedProfile === profile.id 
                      ? 'ring-2 ring-primary' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedProfile(profile.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-semibold">{profile.name}</CardTitle>
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        {profile.deviceCount} device{profile.deviceCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <CardDescription>{profile.description}</CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-1">
                    <div className="flex justify-between items-center w-full">
                      <div className="flex gap-2">
                        <Badge variant={profile.settings.screenLockRequired ? "default" : "outline"}>
                          Screen Lock
                        </Badge>
                        {profile.settings.cameraBlocked && (
                          <Badge variant="destructive">
                            Camera Blocked
                          </Badge>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-50 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProfile(profile.id);
                        }}
                        disabled={profile.deviceCount > 0}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
            
            <div className="md:col-span-2">
              {currentProfile ? (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>{currentProfile.name}</CardTitle>
                      <Badge variant="outline" className="px-2 py-1">
                        <Settings className="h-3.5 w-3.5 mr-1" />
                        Configuration
                      </Badge>
                    </div>
                    <CardDescription>{currentProfile.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Device Restrictions</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                            <span>Camera Access</span>
                            <Badge variant={currentProfile.settings.cameraBlocked ? "destructive" : "outline"}>
                              {currentProfile.settings.cameraBlocked ? "Blocked" : "Allowed"}
                            </Badge>
                          </div>
                          <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                            <span>Screen Lock</span>
                            <Badge variant={currentProfile.settings.screenLockRequired ? "default" : "outline"}>
                              {currentProfile.settings.screenLockRequired ? "Required" : "Optional"}
                            </Badge>
                          </div>
                          <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                            <span>Wi-Fi Networks</span>
                            <Badge variant={currentProfile.settings.wifiRestricted ? "destructive" : "outline"}>
                              {currentProfile.settings.wifiRestricted ? "Restricted" : "Unrestricted"}
                            </Badge>
                          </div>
                          <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                            <span>App Installation</span>
                            <Badge variant={currentProfile.settings.appInstallRestricted ? "destructive" : "outline"}>
                              {currentProfile.settings.appInstallRestricted ? "Restricted" : "Allowed"}
                            </Badge>
                          </div>
                          <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                            <span>VPN Connection</span>
                            <Badge variant={currentProfile.settings.vpnRequired ? "default" : "outline"}>
                              {currentProfile.settings.vpnRequired ? "Required" : "Optional"}
                            </Badge>
                          </div>
                          <div className="flex justify-between p-3 bg-secondary/30 rounded-lg">
                            <span>Auto-Lock Timeout</span>
                            <span className="font-medium">{currentProfile.settings.autolockTimeout} minutes</span>
                          </div>
                        </div>
                      </div>
                      
                      {currentProfile.deviceCount > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">Associated Devices</h3>
                          <div className="border rounded-md p-2">
                            <div className="flex items-center p-2">
                              <Smartphone className="h-4 w-4 text-muted-foreground mr-2" />
                              <span className="text-sm">{currentProfile.deviceCount} device{currentProfile.deviceCount !== 1 ? 's' : ''} using this profile</span>
                            </div>
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
                      Select a profile from the list to view and manage its configuration details.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthCheck>
  );
};

export default Profiles;
