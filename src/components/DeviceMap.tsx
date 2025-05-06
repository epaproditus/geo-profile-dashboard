import { useEffect, useState, useRef } from 'react';
import Map from './Map';
import { useDevices, useUpdateDeviceLocation } from '@/hooks/use-simplemdm';
import { Button } from './ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import locationProfileService from '@/lib/services/location-profile-service';

interface DeviceMapProps {
  policies?: any[];
}

const DeviceMap = ({ policies = [] }: DeviceMapProps) => {
  const { data: devicesData, isLoading, isError, refetch } = useDevices();
  const updateLocation = useUpdateDeviceLocation();
  const [mappableDevices, setMappableDevices] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Add auto-refresh interval reference
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Filter devices that have location data
    if (devicesData?.data) {
      const devicesWithLocation = devicesData.data.filter(device => 
        device.attributes.location_latitude && 
        device.attributes.location_longitude
      );
      
      // Convert to geofence format for map compatibility
      const formattedDevices = devicesWithLocation.map(device => ({
        id: device.id.toString(),
        name: device.attributes.name,
        latitude: parseFloat(device.attributes.location_latitude || '0'),
        longitude: parseFloat(device.attributes.location_longitude || '0'),
        radius: 5, // Small radius for device display
        profileId: null,
        zonePolicyId: null
      }));
      
      setMappableDevices(formattedDevices);
      
      // Update location profile service with the latest devices
      if (policies && policies.length > 0) {
        // Setup the location profile service
        locationProfileService.setPolicies(policies);
        
        // Process each device to check if profile updates are needed
        formattedDevices.forEach(device => {
          locationProfileService.handleDeviceLocationUpdate({
            id: device.id,
            name: device.name,
            latitude: device.latitude,
            longitude: device.longitude
          });
        });
      }
    }
  }, [devicesData, policies]);

  // Add auto-refresh effect to update device locations every 10 minutes
  useEffect(() => {
    // Start the auto-refresh interval when the component mounts
    if (refreshIntervalRef.current === null) {
      console.log('Setting up automatic location refresh every 10 minutes');
      refreshIntervalRef.current = setInterval(() => {
        console.log('Auto-refreshing device locations');
        handleRefreshLocations();
      }, 10 * 60 * 1000); // 10 minutes in milliseconds
    }
    
    // Clean up the interval when the component unmounts
    return () => {
      if (refreshIntervalRef.current) {
        console.log('Cleaning up location refresh interval');
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, []);

  const handleRefreshLocations = async () => {
    if (!devicesData?.data || isRefreshing) return;
    
    setIsRefreshing(true);
    console.log('Refreshing device locations at', new Date().toLocaleTimeString());
    
    try {
      // Request location updates for all devices
      const updatePromises = devicesData.data.map(device => 
        updateLocation.mutateAsync(device.id)
      );
      
      await Promise.all(updatePromises);
      
      // Update our local timestamps for each device location
      devicesData.data.forEach(device => {
        locationProfileService.updateDeviceLocationTimestamp(device.id);
      });
      
      // Wait a moment for the updates to process
      setTimeout(() => {
        refetch();
        setIsRefreshing(false);
      }, 2000);
    } catch (error) {
      console.error('Error refreshing device locations:', error);
      setIsRefreshing(false);
    }
  };

  return (
    <div className="rounded-lg overflow-hidden border h-[500px] relative">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading devices...</span>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-full text-red-500">
          Error loading device data
        </div>
      ) : (
        <>
          <Map 
            geofences={mappableDevices}
            center={mappableDevices.length > 0 
              ? [mappableDevices[0].longitude, mappableDevices[0].latitude] 
              : [-122.4194, 37.7749] // Default to San Francisco
            }
            zoom={10}
          />
          
          <div className="absolute top-2 right-2 z-10">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleRefreshLocations}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Device Locations
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default DeviceMap;