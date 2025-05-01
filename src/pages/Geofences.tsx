import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import AuthCheck from "@/components/AuthCheck";
import Navbar from "@/components/Navbar";
import Map from "@/components/Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Plus, Trash, Search, Map as MapIcon, Edit, Shield, Check, Info } from "lucide-react";
import GeofenceAddressSearch from "@/components/geofences/GeofenceAddressSearch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Type for geofence objects
interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  zonePolicyId: string | null;
}

// Type for zone policy objects
interface ZonePolicy {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  settings: {
    cameraBlocked: boolean;
    screenLockRequired: boolean;
    wifiRestricted: boolean;
  };
}

// LocalStorage helper functions
const STORAGE_KEY = 'geo-profile-dashboard-geofences';
const POLICY_STORAGE_KEY = 'geo-profile-dashboard-policies';

// Default empty geofences array
const defaultGeofences: Geofence[] = [];

// Default policies with a basic fallback
const defaultPolicies: ZonePolicy[] = [
  { 
    id: "default-policy", 
    name: "Default (Fallback) Policy", 
    description: "Applied when devices are outside all defined locations", 
    isDefault: true,
    settings: {
      cameraBlocked: true,       // Block camera by default
      screenLockRequired: true,  // Require screen lock
      wifiRestricted: false      // Keep Wi-Fi allowed
    }
  },
  { 
    id: "test-policy-1", 
    name: "Office Policy", 
    description: "Policy for office locations", 
    isDefault: false,
    settings: {
      cameraBlocked: true,
      screenLockRequired: true,
      wifiRestricted: false
    }
  },
  { 
    id: "test-policy-2", 
    name: "Home Policy", 
    description: "Policy for home locations", 
    isDefault: false,
    settings: {
      cameraBlocked: false,
      screenLockRequired: false,
      wifiRestricted: true
    }
  }
];

// Save geofences to localStorage
const saveGeofencesToLocalStorage = (geofences: Geofence[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(geofences));
    return true;
  } catch (error) {
    console.error('Error saving geofences to localStorage:', error);
    return false;
  }
};

// Load geofences from localStorage
const loadGeofencesFromLocalStorage = (): Geofence[] => {
  try {
    const savedGeofences = localStorage.getItem(STORAGE_KEY);
    return savedGeofences ? JSON.parse(savedGeofences) : defaultGeofences;
  } catch (error) {
    console.error('Error loading geofences from localStorage:', error);
    return defaultGeofences;
  }
};

// Save policies to localStorage
const savePoliciesToLocalStorage = (policies: ZonePolicy[]) => {
  try {
    localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(policies));
    return true;
  } catch (error) {
    console.error('Error saving policies to localStorage:', error);
    return false;
  }
};

// Load policies from localStorage
const loadPoliciesFromLocalStorage = (): ZonePolicy[] => {
  try {
    const savedPolicies = localStorage.getItem(POLICY_STORAGE_KEY);
    if (savedPolicies) {
      const parsed = JSON.parse(savedPolicies);
      // Check if we have all required policies
      const hasAllPolicies = defaultPolicies.every(defaultPolicy => 
        parsed.some((p: ZonePolicy) => p.id === defaultPolicy.id)
      );
      return hasAllPolicies ? parsed : defaultPolicies;
    }
    return defaultPolicies;
  } catch (error) {
    console.error('Error loading policies from localStorage:', error);
    return defaultPolicies;
  }
};

// Policy Card Component
interface PolicyCardProps {
  policy: ZonePolicy;
  geofences: Geofence[];
  onEditGeofence: (id: string) => void;
  onDeleteGeofence: (id: string) => void;
  onDeletePolicy: (id: string) => void;
}

const PolicyCard: React.FC<PolicyCardProps> = ({ policy, geofences, onEditGeofence, onDeleteGeofence, onDeletePolicy }) => {
  // Find all geofences associated with this policy
  const policyGeofences = geofences.filter(geofence => geofence.zonePolicyId === policy.id);
  
  return (
    <Card className={policy.isDefault ? "border-primary" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-medium">{policy.name}</CardTitle>
            {policy.isDefault && (
              <Badge variant="outline" className="mt-1 text-xs border-primary text-primary">
                Default Policy
              </Badge>
            )}
          </div>
          <Badge variant="secondary">
            {policyGeofences.length} location{policyGeofences.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <CardDescription>{policy.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Security Settings</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex justify-between items-center p-2 bg-secondary/20 rounded text-sm">
              <span>Camera Access</span>
              <Badge variant={policy.settings.cameraBlocked ? "destructive" : "outline"}>
                {policy.settings.cameraBlocked ? "Blocked" : "Allowed"}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-secondary/20 rounded text-sm">
              <span>Screen Lock</span>
              <Badge variant={policy.settings.screenLockRequired ? "default" : "outline"}>
                {policy.settings.screenLockRequired ? "Required" : "Optional"}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-secondary/20 rounded text-sm">
              <span>Wi-Fi Networks</span>
              <Badge variant={policy.settings.wifiRestricted ? "destructive" : "outline"}>
                {policy.settings.wifiRestricted ? "Restricted" : "Allowed"}
              </Badge>
            </div>
          </div>
          
          {policy.isDefault ? (
            <div className="border rounded p-3 bg-secondary/10">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  This policy applies when a device is outside all defined locations.
                </p>
              </div>
            </div>
          ) : policyGeofences.length > 0 ? (
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Applied in locations:</span>
              </div>
              <div className="space-y-2">
                {policyGeofences.map(geofence => (
                  <div 
                    key={geofence.id}
                    className="flex justify-between items-center p-2 bg-secondary/20 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{geofence.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {geofence.radius}m radius
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7 opacity-50 hover:opacity-100 hover:bg-primary/10"
                        onClick={() => onEditGeofence(geofence.id)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7 opacity-50 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDeleteGeofence(geofence.id)}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border rounded p-3 bg-secondary/10">
              <p className="text-sm text-muted-foreground">
                This policy is not applied to any locations.
              </p>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button variant="outline" className="flex-1">
          <Shield className="h-4 w-4 mr-2" />
          Edit Policy Settings
        </Button>
        {!policy.isDefault ? (
          <Button 
            variant="destructive" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDeletePolicy(policy.id);
            }}
          >
            <Trash className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="icon"
            disabled
            className="opacity-50 cursor-not-allowed"
            title="Default policy cannot be deleted"
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

const Geofences = () => {
  // Initialize state from localStorage
  const [geofences, setGeofences] = useState<Geofence[]>(loadGeofencesFromLocalStorage);
  const [selectedGeofence, setSelectedGeofence] = useState<string | null>(null);
  const [isAddingGeofence, setIsAddingGeofence] = useState(false);
  const [newGeofenceCoords, setNewGeofenceCoords] = useState<{lat: number, lng: number} | null>(null);
  const [newGeofenceName, setNewGeofenceName] = useState("");
  const [newGeofenceRadius, setNewGeofenceRadius] = useState("100");
  const [newGeofenceZonePolicy, setNewGeofenceZonePolicy] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [geofenceCreationMethod, setGeofenceCreationMethod] = useState<"map" | "address">("map");
  const [locationDisplayName, setLocationDisplayName] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingGeofenceId, setEditingGeofenceId] = useState<string | null>(null);
  const [policies, setPolicies] = useState<ZonePolicy[]>(() => {
    const loadedPolicies = loadPoliciesFromLocalStorage();
    console.log('Loaded policies:', loadedPolicies);
    
    // Ensure we always have at least the default policies
    const hasDefault = loadedPolicies.some(p => p.isDefault);
    const hasTestPolicies = loadedPolicies.some(p => p.id === "test-policy-1" || p.id === "test-policy-2");
    
    if (!hasDefault || !hasTestPolicies) {
      return defaultPolicies;
    }
    return loadedPolicies;
  });
  const [isNewPolicyDialogOpen, setIsNewPolicyDialogOpen] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState('');
  
  const { toast } = useToast();

  const handleAddGeofence = (lat: number, lng: number) => {
    setNewGeofenceCoords({ lat, lng });
    setDialogMode("create");
    setIsDialogOpen(true);
    setIsAddingGeofence(false);
  };

  const handleAddressSelect = (lat: number, lng: number, displayName: string) => {
    setNewGeofenceCoords({ lat, lng });
    setLocationDisplayName(displayName);
    
    // Auto-populate the name field with the location name if empty
    if (!newGeofenceName && dialogMode === "create") {
      // Extract just the main part of the address (before the first comma)
      const simplifiedName = displayName.split(',')[0];
      setNewGeofenceName(simplifiedName);
    }
  };

  const handleSaveGeofence = () => {
    if (!newGeofenceName || !newGeofenceCoords) return;
    
    if (dialogMode === "create") {
      // Create new geofence
      const newGeofence = {
        id: `geo${Date.now()}`,
        name: newGeofenceName,
        latitude: newGeofenceCoords.lat,
        longitude: newGeofenceCoords.lng,
        radius: parseInt(newGeofenceRadius),
        zonePolicyId: newGeofenceZonePolicy === "none" ? null : newGeofenceZonePolicy,
      };
      
      const updatedGeofences = [...geofences, newGeofence];
      setGeofences(updatedGeofences);
      
      // Save to localStorage
      const saved = saveGeofencesToLocalStorage(updatedGeofences);
      
      toast({
        title: "Geofence Added",
        description: `"${newGeofenceName}" has been created successfully${saved ? ' and saved locally' : ''}.`,
      });
    } else if (dialogMode === "edit" && editingGeofenceId) {
      // Update existing geofence
      const updatedGeofences = geofences.map(geofence => {
        if (geofence.id === editingGeofenceId) {
          return {
            ...geofence,
            name: newGeofenceName,
            radius: parseInt(newGeofenceRadius),
            zonePolicyId: newGeofenceZonePolicy === "none" ? null : newGeofenceZonePolicy,
            // Keep the original location if we didn't change it
            latitude: newGeofenceCoords.lat,
            longitude: newGeofenceCoords.lng,
          };
        }
        return geofence;
      });
      
      setGeofences(updatedGeofences);
      
      // Save to localStorage
      const saved = saveGeofencesToLocalStorage(updatedGeofences);
      
      toast({
        title: "Geofence Updated",
        description: `"${newGeofenceName}" has been updated successfully${saved ? ' and saved locally' : ''}.`,
      });
    }
    
    // Reset form
    setNewGeofenceName("");
    setNewGeofenceRadius("100");
    setNewGeofenceZonePolicy(null);
    setNewGeofenceCoords(null);
    setLocationDisplayName(null);
    setEditingGeofenceId(null);
    setIsDialogOpen(false);
  };

  const handleDeletePolicy = (id: string) => {
    const policyToDelete = policies.find(p => p.id === id);
    if (!policyToDelete) return;

    // Double-check we're not deleting the default policy
    if (policyToDelete.isDefault) {
      toast({
        title: "Cannot Delete Default Policy",
        description: "The default policy cannot be deleted as it serves as a fallback.",
        variant: "destructive"
      });
      return;
    }


    // Debug log to confirm the function is being called
    console.log('Attempting to delete policy:', id);
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this policy? Any associated geofences will be unlinked.')) {
      return;
    }

    // Update policies state
    const updatedPolicies = policies.filter(p => p.id !== id);
    setPolicies(updatedPolicies);
    savePoliciesToLocalStorage(updatedPolicies);
    
    // Update any geofences using this policy
    const updatedGeofences = geofences.map(g => {
      if (g.zonePolicyId === id) {
        return { ...g, zonePolicyId: null };
      }
      return g;
    });
    setGeofences(updatedGeofences);
    saveGeofencesToLocalStorage(updatedGeofences);
    
    toast({
      title: "Policy Deleted",
      description: "The policy has been removed and any associated geofences have been unlinked.",
    });
  };

  const handleCreatePolicy = () => {
    if (!newPolicyName.trim()) return;
    
    const newPolicy: ZonePolicy = {
      id: `policy-${Date.now()}`,
      name: newPolicyName,
      description: "",
      isDefault: false,
      settings: {
        cameraBlocked: false,
        screenLockRequired: false,
        wifiRestricted: false
      }
    };
    
    const updatedPolicies = [...policies, newPolicy];
    setPolicies(updatedPolicies);
    savePoliciesToLocalStorage(updatedPolicies);
    
    setNewPolicyName('');
    setIsNewPolicyDialogOpen(false);
    
    toast({
      title: "Policy Created",
      description: `"${newPolicyName}" has been created successfully.`,
    });
  };

  const handleDeleteGeofence = (id: string) => {
    const updatedGeofences = geofences.filter(g => g.id !== id);
    setGeofences(updatedGeofences);
    
    // Save to localStorage
    saveGeofencesToLocalStorage(updatedGeofences);
    
    if (selectedGeofence === id) {
      setSelectedGeofence(null);
    }
    
    toast({
      title: "Geofence Deleted",
      description: "The geofence has been removed and changes are saved locally.",
    });
  };

  const handleOpenDialog = () => {
    setDialogMode("create");
    setNewGeofenceName("");
    setNewGeofenceRadius("100");
    setNewGeofenceZonePolicy(null);
    setLocationDisplayName(null);
    setGeofenceCreationMethod("map");
    setEditingGeofenceId(null);
    setIsDialogOpen(true);
  };

  const handleEditGeofence = (id: string) => {
    const geofenceToEdit = geofences.find(g => g.id === id);
    if (!geofenceToEdit) return;

    setDialogMode("edit");
    setEditingGeofenceId(id);
    setNewGeofenceName(geofenceToEdit.name);
    setNewGeofenceRadius(geofenceToEdit.radius.toString());
    setNewGeofenceZonePolicy(geofenceToEdit.zonePolicyId || "none");
    setNewGeofenceCoords({ lat: geofenceToEdit.latitude, lng: geofenceToEdit.longitude });
    setGeofenceCreationMethod("map"); // Default to map view when editing
    setIsDialogOpen(true);
  };

  // Function to reset to default geofences
  const resetToDefaultGeofences = () => {
    setGeofences(defaultGeofences);
    saveGeofencesToLocalStorage(defaultGeofences);
    toast({
      title: "Geofences Reset",
      description: "All geofences have been reset to default values.",
    });
  };

  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 container mx-auto p-4 md:p-6">
          {/* Page title and action buttons - always visible */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
            <h1 className="text-2xl font-bold">Location Policies</h1>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  if (confirm('This will remove all custom policies. Continue?')) {
                    // Keep only the default policy
                    const defaultOnly = policies.filter(p => p.isDefault);
                    setPolicies(defaultOnly);
                    savePoliciesToLocalStorage(defaultOnly);
                    toast({
                      title: "Policies Reset",
                      description: "All custom policies have been removed.",
                    });
                  }
                }}
              >
                Clear All Policies
              </Button>
              <Button onClick={() => setIsNewPolicyDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Policy
              </Button>
            </div>
          </div>
          
          {/* Policies view */}
          <div className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Policy cards with associated locations */}
                  <div className="lg:col-span-3 space-y-6">
                    {console.log('Rendering policies:', policies)}
                    {policies.map(policy => (
                      <PolicyCard 
                        key={policy.id}
                        policy={policy}
                        geofences={geofences}
                        onEditGeofence={handleEditGeofence}
                        onDeleteGeofence={handleDeleteGeofence}
                        onDeletePolicy={handleDeletePolicy}
                      />
                    ))}
                  </div>
                  
                  {/* Map area (kept in policies view for context) */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardContent className="p-0">
                        <Map 
                          geofences={geofences}
                          selectedGeofence={selectedGeofence}
                          onSelectGeofence={setSelectedGeofence}
                          isAddingGeofence={isAddingGeofence}
                          onAddGeofence={handleAddGeofence}
                          center={newGeofenceCoords 
                            ? [newGeofenceCoords.lng, newGeofenceCoords.lat] 
                            : undefined}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
          </div>
          
        </main>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{dialogMode === "create" ? "Create New Geofence" : "Edit Geofence"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "create" 
                ? "Define a geofence by searching for an address or selecting a location on the map" 
                : "Modify this geofence's properties"
              }
            </DialogDescription>
          </DialogHeader>
          
          <Tabs 
            value={geofenceCreationMethod} 
            onValueChange={(value) => setGeofenceCreationMethod(value as "map" | "address")}
            className="pt-2"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="map">
                <MapIcon className="h-4 w-4 mr-2" />
                Map Selection
              </TabsTrigger>
              <TabsTrigger value="address" disabled={dialogMode === "edit"}>
                <Search className="h-4 w-4 mr-2" />
                Address Search
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="map" className="space-y-4">
              {!newGeofenceCoords && dialogMode === "create" && (
                <div className="p-4 text-center border rounded-md bg-muted/30">
                  <p className="text-muted-foreground">
                    Close this dialog and click "Click on Map" to select a location on the map.
                  </p>
                </div>
              )}
              
              {newGeofenceCoords && (
                <div className="space-y-2">
                  <Label>Selected Location</Label>
                  <div className="p-3 bg-secondary/30 rounded-lg text-sm">
                    <div className="space-y-1">
                      <div>Latitude: {newGeofenceCoords.lat.toFixed(6)}</div>
                      <div>Longitude: {newGeofenceCoords.lng.toFixed(6)}</div>
                      {locationDisplayName && (
                        <div className="pt-2 text-xs text-muted-foreground">
                          {locationDisplayName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="address" className="space-y-4">
              <GeofenceAddressSearch 
                onSelectLocation={handleAddressSelect}
              />
              
              {newGeofenceCoords && locationDisplayName && (
                <div className="p-3 border rounded-md bg-muted/30">
                  <p className="font-medium text-sm">Selected Location:</p>
                  <p className="text-sm text-muted-foreground">{locationDisplayName}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="geofence-name">Name</Label>
              <Input 
                id="geofence-name" 
                placeholder="e.g., Office Building"
                value={newGeofenceName}
                onChange={(e) => setNewGeofenceName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="geofence-radius">Radius (meters)</Label>
              <Input 
                id="geofence-radius" 
                type="number"
                placeholder="100"
                value={newGeofenceRadius}
                onChange={(e) => setNewGeofenceRadius(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="geofence-zonePolicy">Linked Policy</Label>
              <Select 
                value={newGeofenceZonePolicy || "none"} 
                onValueChange={setNewGeofenceZonePolicy}
              >
                <SelectTrigger id="geofence-zonePolicy">
                  <SelectValue placeholder="Select a policy" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={5} className="z-[9999]">
                  <SelectItem value="none">No policy</SelectItem>
                  {defaultPolicies.map((policy) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {policy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveGeofence}
              disabled={!newGeofenceName || !newGeofenceCoords}
            >
              {dialogMode === "create" ? "Create Geofence" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Policy Dialog */}
      <Dialog open={isNewPolicyDialogOpen} onOpenChange={setIsNewPolicyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Policy</DialogTitle>
            <DialogDescription>
              Define a new location policy with custom security settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="policy-name">Policy Name</Label>
              <Input 
                id="policy-name" 
                placeholder="e.g., Secure Facility Policy"
                value={newPolicyName}
                onChange={(e) => setNewPolicyName(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewPolicyDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePolicy}
              disabled={!newPolicyName.trim()}
            >
              Create Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthCheck>
  );
};

export default Geofences;
