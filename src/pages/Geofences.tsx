
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import AuthCheck from "@/components/AuthCheck";
import Navbar from "@/components/Navbar";
import Map from "@/components/Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MapPin, Plus, Trash } from "lucide-react";

// Mock data
const mockGeofences = [
  { id: "geo1", name: "Office", latitude: 40.7128, longitude: -74.0060, radius: 100, profileId: "profile1" },
  { id: "geo2", name: "Warehouse", latitude: 40.7282, longitude: -73.9942, radius: 200, profileId: "profile2" },
];

const mockProfiles = [
  { id: "profile1", name: "Standard Security", description: "Basic security settings" },
  { id: "profile2", name: "High Security", description: "Enhanced security with strict policies" },
  { id: "profile3", name: "Development", description: "Relaxed settings for development devices" },
];

const Geofences = () => {
  const [geofences, setGeofences] = useState(mockGeofences);
  const [selectedGeofence, setSelectedGeofence] = useState<string | null>(null);
  const [isAddingGeofence, setIsAddingGeofence] = useState(false);
  const [newGeofenceCoords, setNewGeofenceCoords] = useState<{lat: number, lng: number} | null>(null);
  const [newGeofenceName, setNewGeofenceName] = useState("");
  const [newGeofenceRadius, setNewGeofenceRadius] = useState("100");
  const [newGeofenceProfile, setNewGeofenceProfile] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { toast } = useToast();

  const handleAddGeofence = (lat: number, lng: number) => {
    setNewGeofenceCoords({ lat, lng });
    setIsDialogOpen(true);
    setIsAddingGeofence(false);
  };

  const handleSaveGeofence = () => {
    if (!newGeofenceName || !newGeofenceCoords) return;
    
    const newGeofence = {
      id: `geo${Date.now()}`,
      name: newGeofenceName,
      latitude: newGeofenceCoords.lat,
      longitude: newGeofenceCoords.lng,
      radius: parseInt(newGeofenceRadius),
      profileId: newGeofenceProfile,
    };
    
    setGeofences([...geofences, newGeofence]);
    toast({
      title: "Geofence Added",
      description: `"${newGeofenceName}" has been created successfully.`,
    });
    
    // Reset form
    setNewGeofenceName("");
    setNewGeofenceRadius("100");
    setNewGeofenceProfile(null);
    setNewGeofenceCoords(null);
    setIsDialogOpen(false);
  };

  const handleDeleteGeofence = (id: string) => {
    setGeofences(geofences.filter(g => g.id !== id));
    if (selectedGeofence === id) {
      setSelectedGeofence(null);
    }
    toast({
      title: "Geofence Deleted",
      description: "The geofence has been removed.",
    });
  };

  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 container mx-auto p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Geofences</h1>
            <Button 
              onClick={() => setIsAddingGeofence(true)}
              disabled={isAddingGeofence}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Geofence
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-0">
                  <Map 
                    geofences={geofences}
                    selectedGeofence={selectedGeofence}
                    onSelectGeofence={setSelectedGeofence}
                    isAddingGeofence={isAddingGeofence}
                    onAddGeofence={handleAddGeofence}
                  />
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Geofence List</CardTitle>
                  <CardDescription>
                    {geofences.length} geofence{geofences.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {geofences.length > 0 ? (
                      geofences.map((geofence) => (
                        <div 
                          key={geofence.id}
                          className={`flex justify-between items-center p-3 rounded-lg cursor-pointer ${
                            selectedGeofence === geofence.id 
                              ? 'bg-primary/10 border border-primary/30' 
                              : 'bg-secondary/30 hover:bg-secondary/50'
                          }`}
                          onClick={() => setSelectedGeofence(geofence.id)}
                        >
                          <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                            <div className="flex flex-col">
                              <span className="font-medium">{geofence.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {geofence.profileId 
                                  ? `Profile: ${mockProfiles.find(p => p.id === geofence.profileId)?.name || 'Unknown'}` 
                                  : 'No profile assigned'}
                              </span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="opacity-50 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGeofence(geofence.id);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <p>No geofences created</p>
                        <p className="text-sm">Click "Add Geofence" to create one</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Geofence</DialogTitle>
            <DialogDescription>
              Define the properties for your new geofence
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
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
              <Label htmlFor="geofence-profile">Linked Profile</Label>
              <Select value={newGeofenceProfile || ""} onValueChange={setNewGeofenceProfile}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No profile</SelectItem>
                  {mockProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Location</Label>
              <div className="p-3 bg-secondary/30 rounded-lg text-sm">
                {newGeofenceCoords ? (
                  <div className="space-y-1">
                    <div>Latitude: {newGeofenceCoords.lat.toFixed(6)}</div>
                    <div>Longitude: {newGeofenceCoords.lng.toFixed(6)}</div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">No location selected</span>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveGeofence}>
              Create Geofence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthCheck>
  );
};

export default Geofences;
