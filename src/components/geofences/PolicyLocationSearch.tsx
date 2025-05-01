import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GeofenceAddressSearch from './GeofenceAddressSearch';
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Crosshair, Loader2 } from 'lucide-react';
import Map from '@/components/Map';
import { reverseGeocode } from '@/lib/services/geocoding';

interface PolicyLocationSearchProps {
  initialLocation?: {
    displayName: string;
    latitude: number;
    longitude: number;
    radius: number;
    geofenceId?: string;
  };
  onLocationSelect: (location: {
    displayName: string;
    latitude: number;
    longitude: number;
    radius: number;
    geofenceId: string;
  }) => void;
  isLoading?: boolean;
}

const PolicyLocationSearch: React.FC<PolicyLocationSearchProps> = ({
  initialLocation,
  onLocationSelect,
  isLoading = false
}) => {
  const [location, setLocation] = useState(initialLocation || {
    displayName: '',
    latitude: 0,
    longitude: 0,
    radius: 100,
    geofenceId: `temp-${Date.now()}`
  });
  
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    initialLocation ? [initialLocation.longitude, initialLocation.latitude] : [-97.98, 26.30]
  );
  
  const [mapZoom, setMapZoom] = useState(initialLocation ? 13 : 4);
  const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);
  
  // Update the local state when initialLocation changes (for editing scenarios)
  useEffect(() => {
    if (initialLocation) {
      setLocation({
        ...initialLocation,
        // Ensure geofenceId always exists
        geofenceId: initialLocation.geofenceId || `temp-${Date.now()}`
      });
      setMapCenter([initialLocation.longitude, initialLocation.latitude]);
      setMapZoom(13); // Zoom in when we have a location
    }
  }, [initialLocation]);

  const handleAddressSelect = (lat: number, lng: number, displayName: string) => {
    const newLocation = {
      displayName,
      latitude: lat,
      longitude: lng,
      radius: location.radius, // Keep existing radius if set
      geofenceId: location.geofenceId || `geo-${Date.now()}` // Maintain or create a geofenceId
    };
    
    setLocation(newLocation);
    setMapCenter([lng, lat]);
    setMapZoom(14);
    
    // Call the parent callback
    onLocationSelect(newLocation);
  };
  
  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const radius = parseInt(e.target.value) || 1;
    const newLocation = { 
      ...location, 
      radius,
      // Ensure geofenceId is always defined
      geofenceId: location.geofenceId || `geo-${Date.now()}`
    };
    
    setLocation(newLocation);
    onLocationSelect(newLocation);
  };
  
  const handleGetCurrentLocation = async () => {
    setIsGettingCurrentLocation(true);
    
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsGettingCurrentLocation(false);
      return;
    }
    
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Try to get a display name for the coordinates
          let displayName = `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          
          try {
            const results = await reverseGeocode(lat, lng);
            if (results.length > 0) {
              displayName = results[0].displayName;
            }
          } catch (error) {
            console.error("Error reverse geocoding:", error);
          }
          
          const newLocation = {
            displayName,
            latitude: lat,
            longitude: lng,
            radius: location.radius,
            geofenceId: location.geofenceId || `geo-${Date.now()}`
          };
          
          setLocation(newLocation);
          setMapCenter([lng, lat]);
          setMapZoom(15);
          onLocationSelect(newLocation);
          setIsGettingCurrentLocation(false);
        },
        (error) => {
          console.error("Error getting current location:", error);
          alert(`Error getting your location: ${error.message}`);
          setIsGettingCurrentLocation(false);
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (error) {
      console.error("Error accessing geolocation:", error);
      setIsGettingCurrentLocation(false);
    }
  };
  
  // Create a geofence object for the map that matches the Map component's expected Geofence type
  const locationGeofence = location.displayName ? {
    id: location.geofenceId || 'policy-preview',
    name: location.displayName,
    latitude: location.latitude,
    longitude: location.longitude,
    radius: location.radius,
    profileId: null,
    zonePolicyId: null
  } : undefined;
  
  return (
    <div className="space-y-6">
      {/* Address search and current location */}
      <div className="space-y-4">
        <div className="flex justify-between">
          <Label>Search for an address</Label>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={handleGetCurrentLocation}
            disabled={isGettingCurrentLocation}
          >
            {isGettingCurrentLocation ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Getting location...
              </>
            ) : (
              <>
                <Crosshair className="mr-2 h-4 w-4" />
                Use my current location
              </>
            )}
          </Button>
        </div>
        
        <GeofenceAddressSearch 
          onSelectLocation={handleAddressSelect}
          isLoading={isLoading || isGettingCurrentLocation}
        />
      </div>
      
      {/* Location details and map */}
      {location.displayName && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location details */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Selected Location</span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{location.displayName}</p>
                    <p className="text-muted-foreground">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location-radius">Radius (meters)</Label>
                    <Input
                      id="location-radius"
                      type="number"
                      min="1"
                      value={location.radius}
                      onChange={handleRadiusChange}
                      className="max-w-[200px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      This defines the area where this policy will be applied
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Map preview */}
            <div className="h-[200px] md:h-auto">
              {locationGeofence && (
                <Map
                  geofences={[locationGeofence]}
                  center={mapCenter}
                  zoom={mapZoom}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyLocationSearch;