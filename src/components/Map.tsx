
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus } from "lucide-react";

// Mock data interface for devices and geofences
interface Device {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  profileId: string | null;
}

interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  profileId: string | null;
}

interface MapProps {
  devices?: Device[];
  geofences?: Geofence[];
  selectedGeofence?: string | null;
  onSelectGeofence?: (id: string | null) => void;
  onAddGeofence?: (lat: number, lng: number) => void;
  isAddingGeofence?: boolean;
}

const Map = ({
  devices = [],
  geofences = [],
  selectedGeofence = null,
  onSelectGeofence = () => {},
  onAddGeofence = () => {},
  isAddingGeofence = false,
}: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapApiKey, setMapApiKey] = useState<string | null>(localStorage.getItem("mapApiKey"));
  const { toast } = useToast();
  const [showKeyInput, setShowKeyInput] = useState(!mapApiKey);

  // This is a placeholder for a real map implementation
  // In a real application, you would use a mapping library like Mapbox GL or Leaflet
  const renderMap = () => {
    if (!mapApiKey) return;
    
    console.log("Rendering map with API key", mapApiKey);
    console.log("Devices:", devices);
    console.log("Geofences:", geofences);
    
    // The actual map implementation would go here
    // For now, we'll just display a placeholder
  };

  const saveApiKey = () => {
    if (mapApiKey) {
      localStorage.setItem("mapApiKey", mapApiKey);
      setShowKeyInput(false);
      toast({
        title: "API Key Saved",
        description: "Your map API key has been saved",
      });
      renderMap();
    }
  };

  useEffect(() => {
    if (mapApiKey && mapContainerRef.current) {
      renderMap();
    }
  }, [mapApiKey, devices, geofences, selectedGeofence]);

  if (showKeyInput) {
    return (
      <Card className="w-full h-full min-h-[400px]">
        <CardContent className="flex flex-col items-center justify-center p-6 h-full">
          <div className="w-full max-w-md space-y-4">
            <h3 className="text-lg font-medium">Map API Key Required</h3>
            <p className="text-sm text-muted-foreground">
              To display the map, please enter your map API key:
            </p>
            <div className="space-y-2">
              <Label htmlFor="apiKey">Map API Key</Label>
              <Input
                id="apiKey"
                value={mapApiKey || ''}
                onChange={(e) => setMapApiKey(e.target.value)}
                placeholder="Enter your map API key"
              />
            </div>
            <Button onClick={saveApiKey}>Save and Load Map</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full min-h-[400px]">
      <CardContent className="p-0 relative">
        <div 
          ref={mapContainerRef}
          className="w-full h-[400px] bg-secondary/30 rounded-md overflow-hidden flex items-center justify-center"
        >
          {/* Placeholder for the map */}
          <div className="text-center p-4">
            <p className="text-muted-foreground mb-2">Map visualization would render here</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {geofences.map((geofence) => (
                <Button
                  key={geofence.id}
                  variant={selectedGeofence === geofence.id ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => onSelectGeofence(geofence.id)}
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  {geofence.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {isAddingGeofence && (
          <div className="absolute bottom-4 left-4 bg-card p-3 rounded-md border shadow-md">
            <p className="text-xs text-muted-foreground mb-2">
              Click on the map to place a new geofence
            </p>
            <Button 
              size="sm" 
              variant="outline"
              className="w-full"
              onClick={() => onAddGeofence(40.7128, -74.0060)} // Example coordinates (NYC)
            >
              <Plus className="h-3 w-3 mr-1" /> 
              Place Geofence (Demo)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Map;
