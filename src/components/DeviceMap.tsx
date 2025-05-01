import { useState, useEffect } from "react";
import Map from "@/components/Map";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDevices, useUpdateDeviceLocation } from "@/hooks/use-simplemdm";
import { Button } from "@/components/ui/button";
import { RefreshCw, MapPin } from "lucide-react";
import { SimpleMDMDevice } from "@/lib/api/simplemdm";

interface DeviceMapProps {
  deviceIds?: number[]; // Allow filtering to specific devices
  height?: string;
  showControls?: boolean;
}

const DeviceMap = ({ deviceIds, height = "400px", showControls = true }: DeviceMapProps) => {
  const { data: devicesData, isLoading, refetch } = useDevices({ limit: 100 });
  const updateDeviceLocation = useUpdateDeviceLocation();
  const [mapCenter, setMapCenter] = useState<[number, number]>([-97.98, 26.30]); // Default to your iPhone's location
  const [mapZoom, setMapZoom] = useState(12);

  // Convert SimpleMDM devices to the format expected by the Map component
  const mapDevices = devicesData?.data
    ?.filter(device => 
      // Filter by deviceIds if provided, otherwise show all devices with location data
      (!deviceIds || deviceIds.includes(Number(device.id))) && 
      device.attributes.location_latitude && 
      device.attributes.location_longitude
    )
    .map(device => ({
      id: String(device.id),
      name: device.attributes.name,
      latitude: parseFloat(device.attributes.location_latitude || "0"),
      longitude: parseFloat(device.attributes.location_longitude || "0"),
      profileId: null,
      lastSeen: device.attributes.last_seen_at,
      model: device.attributes.model_name
    })) || [];

  // Request location updates for all visible devices
  const handleRefreshLocations = async () => {
    const visibleDevices = deviceIds || devicesData?.data?.map(d => Number(d.id)) || [];
    
    // Update devices one by one
    for (const id of visibleDevices) {
      try {
        await updateDeviceLocation.mutateAsync(id);
      } catch (error) {
        console.error(`Failed to update location for device ${id}:`, error);
      }
    }
    
    // Refetch all devices to get the updated locations
    refetch();
  };

  // Calculate optimal map center and zoom based on device locations
  const fitMapToDevices = () => {
    if (mapDevices.length === 0) return;
    
    if (mapDevices.length === 1) {
      // If only one device, center on it with a higher zoom
      setMapCenter([mapDevices[0].longitude, mapDevices[0].latitude]);
      setMapZoom(14);
      return;
    }
    
    // Calculate bounding box for all devices
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    
    mapDevices.forEach(device => {
      minLat = Math.min(minLat, device.latitude);
      maxLat = Math.max(maxLat, device.latitude);
      minLng = Math.min(minLng, device.longitude);
      maxLng = Math.max(maxLng, device.longitude);
    });
    
    // Center point of the bounding box
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // Set center and let the map calculate appropriate zoom
    setMapCenter([centerLng, centerLat]);
    
    // Calculate appropriate zoom level based on the size of the bounding box
    // This is a simple heuristic - adjust as needed
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    if (maxDiff < 0.01) setMapZoom(15);      // Very close together
    else if (maxDiff < 0.1) setMapZoom(14);  // Fairly close
    else if (maxDiff < 0.5) setMapZoom(12);  // Moderate distance
    else if (maxDiff < 1) setMapZoom(10);    // City level
    else if (maxDiff < 5) setMapZoom(8);     // Region level
    else setMapZoom(6);                       // State level
  };

  // Fit map to devices when they load or change
  useEffect(() => {
    if (mapDevices.length > 0) {
      fitMapToDevices();
    }
  }, [mapDevices]);

  // No devices with location data
  if (mapDevices.length === 0 && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device Locations</CardTitle>
          <CardDescription>
            No devices with location data available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              No device location data found. Try requesting location updates.
            </p>
            <Button 
              onClick={handleRefreshLocations} 
              disabled={updateDeviceLocation.isPending}
            >
              {updateDeviceLocation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating Locations...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Request Location Updates
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Device Locations</CardTitle>
            <CardDescription>
              {isLoading 
                ? "Loading device locations..." 
                : `${mapDevices.length} device${mapDevices.length !== 1 ? 's' : ''} on the map`
              }
            </CardDescription>
          </div>
          {showControls && (
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fitMapToDevices}
              >
                <MapPin className="mr-2 h-4 w-4" />
                Fit to Devices
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshLocations}
                disabled={updateDeviceLocation.isPending}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${updateDeviceLocation.isPending ? 'animate-spin' : ''}`} />
                Update Locations
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div style={{ height }}>
          <Map 
            devices={mapDevices}
            geofences={[]}
            center={mapCenter}
            zoom={mapZoom}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default DeviceMap;