import React, { useState } from 'react';
import { useProfiles, usePushProfileToDevice, useDevices } from '@/hooks/use-simplemdm';
import { SimpleMDMProfile } from '@/lib/api/simplemdm';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, ArrowRight, Server, Clock, X, MapPin, Settings, Lock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useNonAdminInstallableProfiles, useToggleNonAdminInstallable } from '@/hooks/use-non-admin-installable-profiles';
import { useIsAdmin } from '@/hooks/use-auth';

// Mock geofence data - replace with real API call when ready
const mockGeofences = [
  { 
    id: 1, 
    name: 'Office HQ', 
    address: '123 Main St, San Francisco', 
    radius: 200,
    associatedProfileId: 2 // Reference to the profile ID
  },
  { 
    id: 2, 
    name: 'Warehouse', 
    address: '456 Storage Ave, Oakland', 
    radius: 300,
    associatedProfileId: 3
  },
  { 
    id: 3, 
    name: 'Downtown Store', 
    address: '789 Market St, San Francisco', 
    radius: 150,
    associatedProfileId: 4
  },
  { 
    id: 4, 
    name: 'Airport', 
    address: 'SFO International Terminal', 
    radius: 500,
    associatedProfileId: 3
  }
];

const ProfilesList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  
  const { data: profilesData, isLoading, error } = useProfiles({ limit: 50 });
  
  // Filter profiles based on search term
  const filteredProfiles = profilesData?.data?.filter(profile => 
    profile.attributes.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Configuration Profiles</h2>
        <div className="relative w-64">
          <Input
            type="text"
            placeholder="Search profiles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-8"
          />
          {searchTerm && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              <p>Error loading profiles. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredProfiles.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              {searchTerm ? (
                <p>No profiles found matching "{searchTerm}"</p>
              ) : (
                <p>No profiles available in your SimpleMDM account</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map((profile) => (
            <ProfileCard 
              key={profile.id} 
              profile={profile} 
              onDeploy={() => {
                setSelectedProfileId(profile.id);
                setIsDeployDialogOpen(true);
              }}
              onManageLocations={() => {
                setSelectedProfileId(profile.id);
                setIsLocationDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}
      
      {/* Deploy Profile Dialog */}
      <DeployProfileDialog
        open={isDeployDialogOpen}
        onOpenChange={setIsDeployDialogOpen}
        profileId={selectedProfileId}
      />

      {/* Manage Locations Dialog */}
      <ManageLocationsDialog
        open={isLocationDialogOpen}
        onOpenChange={setIsLocationDialogOpen}
        profileId={selectedProfileId}
        profiles={filteredProfiles}
      />
    </div>
  );
};

interface ProfileCardProps {
  profile: SimpleMDMProfile;
  onDeploy: () => void;
  onManageLocations: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onDeploy, onManageLocations }) => {
  const { isAdmin } = useIsAdmin();
  const { data: nonAdminInstallableProfiles, isLoading: isLoadingPermissions } = useNonAdminInstallableProfiles();
  const toggleNonAdminInstallable = useToggleNonAdminInstallable();
  
  // Check if this profile is installable by non-admins
  const isNonAdminInstallable = nonAdminInstallableProfiles?.includes(profile.id) || false;
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Get isDefault status from profile attributes
  const isDefault = profile.attributes.custom_attributes?.isDefault || false;
  
  // Find locations associated with this profile
  const associatedLocations = mockGeofences.filter(
    location => location.associatedProfileId === profile.id
  );
  
  const getProfileTypeIcon = (type: string) => {
    switch (type) {
      case 'configuration':
        return <Server className="h-4 w-4 mr-2" />;
      default:
        return <Shield className="h-4 w-4 mr-2" />;
    }
  };
  
  return (
    <Card className={isDefault ? "border-primary" : undefined}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{profile.attributes.name}</CardTitle>
            {isDefault && (
              <Badge variant="outline" className="mt-1 text-xs border-primary text-primary">
                Default Profile
              </Badge>
            )}
          </div>
          <Badge variant={profile.attributes.status === 'active' ? 'default' : 'secondary'}>
            {profile.attributes.status}
          </Badge>
        </div>
        <CardDescription className="flex items-center text-xs text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          Updated {formatDate(profile.attributes.updated_at)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-2">
          {getProfileTypeIcon(profile.attributes.profile_type)}
          <span className="text-sm capitalize">
            {profile.attributes.profile_type || 'Configuration'} Profile
          </span>
        </div>
        {profile.attributes.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {profile.attributes.description}
          </p>
        )}
        
        {/* Admin toggle for non-admin installation */}
        {isAdmin && (
          <div className="mt-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Non-admin installation</span>
              </div>
              <Switch
                checked={isNonAdminInstallable}
                disabled={isLoadingPermissions}
                onCheckedChange={(checked) => {
                  toggleNonAdminInstallable.mutate({
                    profileId: profile.id,
                    isInstallable: checked
                  });
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isNonAdminInstallable 
                ? "Non-admin users can install this profile" 
                : "Only administrators can install this profile"}
            </p>
          </div>
        )}
        
        {/* Display non-admin installable badge for all users */}
        {isNonAdminInstallable && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs border-blue-400 text-blue-500">
              <Users className="h-3 w-3 mr-1" />
              Non-admin installable
            </Badge>
          </div>
        )}
        
        {/* Display associated locations */}
        {associatedLocations.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium mb-1">Applied in locations:</p>
            <div className="flex flex-wrap gap-1">
              {associatedLocations.map(location => (
                <Badge key={location.id} variant="secondary" className="text-xs">
                  {location.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Indicate if this is the default policy */}
        {isDefault && (
          <div className="mt-3 text-xs text-muted-foreground">
            Applied when device is outside all defined locations
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button onClick={onManageLocations} className="w-full" variant="outline">
          <MapPin className="h-4 w-4 mr-2" />
          Manage Locations
        </Button>
        <Button onClick={onDeploy} className="w-full" variant="outline">
          <ArrowRight className="h-4 w-4 mr-2" />
          Deploy to Device
        </Button>
      </CardFooter>
    </Card>
  );
};

interface DeployProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: number | null;
}

const DeployProfileDialog: React.FC<DeployProfileDialogProps> = ({ 
  open, 
  onOpenChange,
  profileId
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isTemporary, setIsTemporary] = useState<boolean>(false);
  const [temporaryDuration, setTemporaryDuration] = useState<number>(30);
  const [enableNotifications, setEnableNotifications] = useState<boolean>(true);
  const { data: devicesData, isLoading: isLoadingDevices } = useDevices({ limit: 100 });
  const { data: profileData } = useProfile(profileId || '');
  const pushProfile = usePushProfileToDevice();
  
  const handleDeployProfile = () => {
    if (profileId && selectedDeviceId) {
      // Get profile name
      const profileName = profileData?.data?.attributes?.name || `Profile ${profileId}`;
      
      // Get device name
      const device = devicesData?.data?.find(d => d.id.toString() === selectedDeviceId);
      const deviceName = device?.attributes?.name || `Device ${selectedDeviceId}`;
      
      pushProfile.mutate(
        { 
          profileId, 
          deviceId: selectedDeviceId,
          isTemporary,
          temporaryDuration,
          enableNotifications,
          profileName,
          deviceName
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            setSelectedDeviceId('');
          }
        }
      );
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deploy Profile to Device</DialogTitle>
          <DialogDescription>
            Select a device to deploy this profile to. The profile will be installed on the device shortly.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="device-select" className="text-sm font-medium">
              Select Device
            </label>
            {isLoadingDevices ? (
              <Skeleton className="h-10 w-full" />
            ) : devicesData?.data && devicesData.data.length > 0 ? (
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger id="device-select">
                  <SelectValue placeholder="Select a device" />
                </SelectTrigger>
                <SelectContent>
                  {devicesData.data
                    .filter(device => device.attributes.status === 'enrolled')
                    .map(device => (
                      <SelectItem key={device.id} value={device.id.toString()}>
                        {device.attributes.name} ({device.attributes.model_name})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-center p-4 border rounded-md text-muted-foreground">
                No enrolled devices found.
              </div>
            )}
          </div>
          
          {/* Temporary installation option */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="temporary" 
                checked={isTemporary}
                onCheckedChange={(checked) => setIsTemporary(checked === true)}
              />
              <label 
                htmlFor="temporary"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Temporary installation
              </label>
            </div>
            
            {isTemporary && (
              <div className="pl-6 space-y-2">
                <Label htmlFor="duration" className="text-sm">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="1440"
                  value={temporaryDuration}
                  onChange={(e) => setTemporaryDuration(parseInt(e.target.value) || 30)}
                  className="max-w-[150px]"
                />
                <p className="text-xs text-muted-foreground">
                  Profile will be automatically removed after the specified duration.
                </p>
              </div>
            )}
          </div>
          
          {/* Notification option */}
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="notifications" 
                checked={enableNotifications}
                onCheckedChange={(checked) => setEnableNotifications(checked === true)}
              />
              <label 
                htmlFor="notifications"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Send push notifications
              </label>
            </div>
            
            {enableNotifications && (
              <div className="pl-6">
                <p className="text-xs text-muted-foreground">
                  You'll receive notifications when the profile is installed and removed.
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-1 px-0 h-auto text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      // Show a guide for subscribing to ntfy
                      toast({
                        title: "Push Notification Setup",
                        description: (
                          <div className="prose prose-sm dark:prose-invert">
                            <p>1. Install the ntfy app on your device</p>
                            <p>2. Subscribe to topic: <code>geo-profile-dashboard</code></p>
                            <p>3. Server: <code>https://ntfy.sh</code></p>
                          </div>
                        ),
                        duration: 10000,
                      });
                    }}
                  >
                    Setup guide
                  </Button>
                </p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button 
            onClick={handleDeployProfile} 
            disabled={!selectedDeviceId || pushProfile.isPending}
          >
            {pushProfile.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isTemporary ? 'Scheduling...' : 'Deploying...'}
              </>
            ) : (
              <>
                <ArrowRight className="mr-2 h-4 w-4" />
                {isTemporary ? 'Schedule Temporary Install' : 'Deploy Profile'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ManageLocationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: number | null;
  profiles: SimpleMDMProfile[];
}

// New component for managing profile location assignments
const ManageLocationsDialog: React.FC<ManageLocationsDialogProps> = ({ 
  open, 
  onOpenChange,
  profileId,
  profiles
}) => {
  const profile = profiles.find(p => p.id === profileId);
  const [isDefault, setIsDefault] = useState(profile?.attributes.custom_attributes?.isDefault || false);
  
  // Find which locations this profile is associated with
  const associatedLocations = mockGeofences.filter(
    geofence => geofence.associatedProfileId === profileId
  );
  
  const [selectedLocations, setSelectedLocations] = useState<number[]>(
    associatedLocations.map(location => location.id)
  );
  
  // This would be a mutation hook to update the profile's custom attributes and location associations
  const handleSaveLocations = () => {
    // In a real implementation, this would call an API to update the profile and location associations
    console.log('Saving profile location settings:', {
      profileId,
      isDefault,
      selectedLocations,
    });
    
    // Mock success - would be replaced with real API call
    setTimeout(() => {
      onOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Profile Locations</DialogTitle>
          <DialogDescription>
            Configure where this profile should be applied based on device location.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Default profile setting */}
          <div className="flex items-center justify-between space-x-2">
            <div>
              <Label htmlFor="default-profile" className="font-medium">Default Profile</Label>
              <p className="text-sm text-muted-foreground">
                Apply this profile when a device is not in any defined location
              </p>
            </div>
            <Switch
              id="default-profile"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>
          
          {/* Location selection */}
          <div className="space-y-3">
            <Label className="font-medium">Apply this profile in these locations:</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-[200px] overflow-y-auto">
              {mockGeofences.map((location) => {
                // Check if this location already has a different profile assigned
                const hasOtherProfile = location.associatedProfileId && 
                                       location.associatedProfileId !== profileId;
                
                return (
                  <div key={location.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={`location-${location.id}`}
                      checked={selectedLocations.includes(location.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedLocations([...selectedLocations, location.id]);
                        } else {
                          setSelectedLocations(selectedLocations.filter(id => id !== location.id));
                        }
                      }}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`location-${location.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {location.name}
                        </label>
                        {hasOtherProfile && (
                          <Badge variant="outline" className="text-xs">
                            Has assigned profile
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {location.address}
                      </p>
                    </div>
                  </div>
                );
              })}
              
              {mockGeofences.length === 0 && (
                <div className="text-center p-4 text-muted-foreground text-sm">
                  No locations defined. Create locations first to assign this profile.
                </div>
              )}
            </div>
            
            {/* Informational note */}
            <p className="text-xs text-muted-foreground">
              Note: Each location can only have one profile assigned to it. 
              Selecting a location will reassign it from any other profile.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button 
            onClick={handleSaveLocations}
            className="space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Save Settings</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilesList;