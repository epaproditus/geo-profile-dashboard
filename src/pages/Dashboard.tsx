import { useState, useEffect } from "react";
import AuthCheck from "@/components/AuthCheck";
import Navbar from "@/components/Navbar";
import Map from "@/components/Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow, differenceInMinutes } from "date-fns";
import { MapPin, Smartphone, Shield, RefreshCw, AlertCircle, MapPinOff } from "lucide-react";
import { useDevices, useUpdateDeviceLocation } from "@/hooks/use-simplemdm";
import { Loader2 } from "lucide-react";

// Constants for localStorage keys and location staleness
const POLICY_STORAGE_KEY = 'geo-profile-dashboard-policies';
const LOCATION_STALENESS_MINUTES = 5; // Location data is considered stale after 5 minutes

// Type definitions for policies, matching Geofences.tsx
interface ZonePolicy {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  locations: {
    displayName: string;
    latitude: number;
    longitude: number;
    radius: number;
    geofenceId: string;
  }[];
  devices: {
    id: string;
    name: string;
  }[];
  profiles: {
    id: string;
    name: string;
  }[];
}

// Helper functions to load policies from localStorage (same as in Geofences.tsx)
const loadPoliciesFromLocalStorage = (): ZonePolicy[] => {
  try {
    const saved = localStorage.getItem(POLICY_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading policies from localStorage:', error);
  }
  return defaultPolicies;
};

// Default policies with a basic fallback (matching Geofences.tsx)
const defaultPolicies: ZonePolicy[] = [
  { 
    id: "default-policy", 
    name: "Default (Fallback) Policy", 
    description: "Applied when devices are outside all defined locations", 
    isDefault: true,
    locations: [
      {
        displayName: "Global Default Location",
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 0,
        geofenceId: "default-geofence"
      }
    ],
    devices: [],
    profiles: []
  }
];

// Helper function to determine if a device is within a policy's location
const isDeviceWithinPolicyLocation = (deviceLat: number, deviceLng: number, policy: ZonePolicy): boolean => {
  if (policy.isDefault) return false; // Default policy doesn't match by location
  
  // Check all locations for this policy
  return policy.locations.some(location => {
    if (location.radius === 0) return false; // Skip default location with radius 0
    
    // Calculate distance between device and policy location (haversine formula)
    const lat1 = deviceLat;
    const lon1 = deviceLng;
    const lat2 = location.latitude;
    const lon2 = location.longitude;
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = 
      Math.sin(Δφ/2) * Math.sin(Δφ/2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance <= location.radius;
  });
};

// Helper function to check if location data is stale (older than LOCATION_STALENESS_MINUTES)
const isLocationStale = (locationTimestamp: Date): boolean => {
  // Check if the timestamp is more than LOCATION_STALENESS_MINUTES minutes old
  const minutesOld = differenceInMinutes(new Date(), locationTimestamp);
  return minutesOld > LOCATION_STALENESS_MINUTES;
};

// Helper function to get the active policy for a device
const getActivePolicyForDevice = (
  deviceLat: number, 
  deviceLng: number, 
  deviceId: string, 
  policies: ZonePolicy[],
  locationTimestamp: Date | null
): ZonePolicy | undefined => {
  // If location is stale or missing, always return the default policy
  if (!locationTimestamp || isLocationStale(locationTimestamp)) {
    return policies.find(p => p.isDefault);
  }
  
  // First check if device is assigned to policies directly
  const assignedPolicies = policies.filter(p => 
    p.devices.some(d => d.id === deviceId)
  );
  
  if (assignedPolicies.length > 0) {
    // If device is assigned to a policy directly, return the first one
    // (In a real app, you would need logic to prioritize policies)
    return assignedPolicies[0];
  }
  
  // If device isn't assigned directly, check location-based policies
  const locationPolicies = policies.filter(p => 
    !p.isDefault && isDeviceWithinPolicyLocation(deviceLat, deviceLng, p)
  );
  
  if (locationPolicies.length > 0) {
    // Return the first matching location policy
    // (In a real app, you would need logic to prioritize policies)
    return locationPolicies[0];
  }
  
  // If no location-based policies match, return the default policy
  return policies.find(p => p.isDefault);
};

const Dashboard = () => {
  const [policies, setPolicies] = useState<ZonePolicy[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [refreshingLocation, setRefreshingLocation] = useState<string | false>(false);
  
  // Use the SimpleMDM API hooks to get real device data
  const { 
    data: devicesData, 
    isLoading: isLoadingDevices, 
    isError: isErrorDevices,
    refetch: refetchDevices 
  } = useDevices();
  
  // Mutation hook for updating device locations
  const updateDeviceLocation = useUpdateDeviceLocation();
  
  // Load policies from localStorage on component mount
  useEffect(() => {
    setPolicies(loadPoliciesFromLocalStorage());
  }, []);
  
  // Format devices from the API response
  const formattedDevices = devicesData?.data?.map(device => {
    // Extract location data
    const hasLocation = device.attributes.location_latitude && device.attributes.location_longitude;
    const latitude = hasLocation ? parseFloat(device.attributes.location_latitude || '0') : undefined;
    const longitude = hasLocation ? parseFloat(device.attributes.location_longitude || '0') : undefined;
    const locationTimestamp = device.attributes.location_updated_at ? new Date(device.attributes.location_updated_at) : null;
    
    // Check if location is stale
    const isStaleLocation = locationTimestamp ? isLocationStale(locationTimestamp) : true;
    
    // Determine active policy if location is available
    let activePolicy = undefined;
    if (hasLocation && latitude && longitude) {
      activePolicy = getActivePolicyForDevice(
        latitude, 
        longitude, 
        device.id.toString(), 
        policies,
        locationTimestamp
      )?.id;
    } else {
      // No location data, use default policy
      activePolicy = policies.find(p => p.isDefault)?.id;
    }
    
    return {
      id: device.id.toString(),
      name: device.attributes.name,
      model: device.attributes.model_name || 'Unknown model',
      os_version: device.attributes.os_version || 'Unknown OS',
      supervised: device.attributes.is_supervised || false,
      battery: device.attributes.battery_level ? `${device.attributes.battery_level}` : 'Unknown',
      online: device.attributes.status === 'enrolled',
      last_seen: device.attributes.last_seen_at ? new Date(device.attributes.last_seen_at) : new Date(),
      location: hasLocation ? {
        latitude: latitude!,
        longitude: longitude!,
        accuracy: device.attributes.location_accuracy || 0,
        last_updated: locationTimestamp || new Date(),
        is_stale: isStaleLocation
      } : undefined,
      activePolicy,
      sharingLocation: hasLocation && !isStaleLocation
    };
  }) || [];
  
  // Format the map data for the Map component
  const mapData = {
    // Format geofences from policies
    geofences: policies.flatMap(policy => 
      policy.locations.map(loc => ({
        id: loc.geofenceId,
        name: `${policy.name}: ${loc.displayName}`,
        latitude: loc.latitude,
        longitude: loc.longitude,
        radius: loc.radius,
        color: policy.id === "default-policy" ? "#3b82f6" : policy.id.includes("office") ? "#10b981" : "#f97316",
        borderColor: policy.id === "default-policy" ? "#2563eb" : policy.id.includes("office") ? "#059669" : "#ea580c",
        profileId: null,
        zonePolicyId: policy.id
      }))
    ).filter(g => g.radius > 0), // Filter out default policy with radius 0
    
    // Format devices for the map - only show devices with non-stale location data
    devices: formattedDevices
      .filter(device => device.location && !device.location.is_stale)
      .map(device => ({
        id: device.id,
        name: device.name,
        latitude: device.location!.latitude,
        longitude: device.location!.longitude,
        profileId: null,
        model: device.model,
        lastSeen: device.last_seen.toISOString()
      }))
  };
  
  // Calculate map center based on the following priority:
  // 1. If devices with location data exist, use the first device's location
  // 2. If geofences exist (from policies), use the first geofence's location
  // 3. Default to NYC as a last resort
  const mapCenter: [number, number] = mapData.devices.length > 0 
    ? [mapData.devices[0].longitude, mapData.devices[0].latitude]
    : mapData.geofences.length > 0
      ? [mapData.geofences[0].longitude, mapData.geofences[0].latitude] 
      : [-74.0060, 40.7128]; // Default to NYC only if no devices or geofences
  
  // Handle refreshing a device's location
  const handleRefreshLocation = async (deviceId: string) => {
    setRefreshingLocation(deviceId);
    
    try {
      // Use the real API to update location
      await updateDeviceLocation.mutateAsync(deviceId);
      
      // Wait a moment for the updates to process on the MDM server
      setTimeout(() => {
        refetchDevices();
        setRefreshingLocation(false);
      }, 2000);
    } catch (error) {
      console.error('Error updating device location:', error);
      setRefreshingLocation(false);
    }
  };

  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 container mx-auto p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/geofences">
                  <MapPin className="h-4 w-4 mr-2" />
                  Policies & Geofences
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/devices">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Devices
                </a>
              </Button>
            </div>
          </div>
          
          {isLoadingDevices ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading devices...</span>
            </div>
          ) : isErrorDevices ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-center mb-6">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>Error loading devices. Please check your API configuration.</span>
            </div>
          ) : (
            formattedDevices.length === 0 ? (
              <div className="bg-amber-50 text-amber-700 p-4 rounded-md flex items-center mb-6">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>No devices found. Please enroll devices in SimpleMDM.</span>
              </div>
            ) : (
              // Redesigned layout - Devices on left, map on right
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Device Policy Status Panel - Now on the left */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle>Active Policy Status</CardTitle>
                      <CardDescription>
                        Policies currently applied to each device
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto">
                      <div className="space-y-4">
                        {formattedDevices.map((device) => {
                          const activePolicy = policies.find(p => p.id === device.activePolicy);
                          const borderColor = activePolicy?.id === "default-policy" 
                            ? "#2563eb" 
                            : activePolicy?.id.includes("office") 
                              ? "#059669" 
                              : "#ea580c";
                          
                          return (
                            <Card key={device.id} className="border-l-4" style={{ borderLeftColor: borderColor || '#94a3b8' }}>
                              <CardHeader className="p-3 pb-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2">
                                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <h3 className="font-medium text-sm">{device.name}</h3>
                                      <p className="text-xs text-muted-foreground">{device.model}</p>
                                    </div>
                                  </div>
                                  {device.online ? (
                                    <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                                      Online
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="border-orange-500 text-orange-600 text-xs">
                                      {device.last_seen ? formatDistanceToNow(device.last_seen) + ' ago' : 'Unknown'}
                                    </Badge>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-0">
                                <div className="mt-2 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <Shield className="h-3.5 w-3.5" style={{ color: borderColor }} />
                                      <span className="text-sm font-medium">{activePolicy?.name || "Default Policy"}</span>
                                    </div>
                                    <Badge 
                                      className="text-[10px]" 
                                      variant={
                                        !device.location ? "outline" :
                                        device.location.is_stale ? "secondary" :
                                        activePolicy?.isDefault ? "secondary" : "default"
                                      }
                                    >
                                      {!device.location ? "No Location" :
                                       device.location.is_stale ? "Stale Location" :
                                       activePolicy?.isDefault ? "Default" : "Location-based"}
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-xs text-muted-foreground">
                                    {!device.location ? (
                                      "No location data available. Using default policy."
                                    ) : device.location.is_stale ? (
                                      `Location data is stale (>5 min old). Using default policy.`
                                    ) : activePolicy?.isDefault ? (
                                      "Device outside all policy boundaries. Using default policy."
                                    ) : activePolicy?.locations[0] ? (
                                      `Within "${activePolicy?.locations[0].displayName}" boundary`
                                    ) : (
                                      "Location-based policy"
                                    )}
                                  </div>
                                  
                                  {device.location ? (
                                    <div className="flex items-center justify-between pt-1 text-xs">
                                      <div className="flex items-center">
                                        {device.location.is_stale ? (
                                          <MapPinOff className="h-3 w-3 mr-1 text-orange-500" />
                                        ) : (
                                          <MapPin className="h-3 w-3 mr-1 text-green-500" />
                                        )}
                                        <span className={`text-muted-foreground ${device.location.is_stale ? "text-orange-500" : ""}`}>
                                          Updated {formatDistanceToNow(device.location.last_updated)} ago
                                        </span>
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 px-2"
                                        onClick={() => handleRefreshLocation(device.id)}
                                        disabled={refreshingLocation === device.id}
                                      >
                                        <RefreshCw className={`h-3 w-3 mr-1 ${refreshingLocation === device.id ? "animate-spin" : ""}`} />
                                        Update
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between pt-1 text-xs">
                                      <span className="text-muted-foreground flex items-center">
                                        <MapPinOff className="h-3 w-3 mr-1 text-orange-500" />
                                        No location data available
                                      </span>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 px-2"
                                        onClick={() => handleRefreshLocation(device.id)}
                                        disabled={refreshingLocation === device.id}
                                      >
                                        <RefreshCw className={`h-3 w-3 mr-1 ${refreshingLocation === device.id ? "animate-spin" : ""}`} />
                                        Request
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Summary Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col p-3 bg-secondary/30 rounded-lg">
                            <span className="text-muted-foreground text-sm">Policies</span>
                            <span className="text-2xl font-bold">{policies.length}</span>
                          </div>
                          <div className="flex flex-col p-3 bg-secondary/30 rounded-lg">
                            <span className="text-muted-foreground text-sm">Devices</span>
                            <span className="text-2xl font-bold">{formattedDevices.length}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col p-3 bg-secondary/30 rounded-lg">
                            <span className="text-muted-foreground text-sm">Sharing Location</span>
                            <span className="text-2xl font-bold">{formattedDevices.filter(d => d.sharingLocation).length}</span>
                          </div>
                          <div className="flex flex-col p-3 bg-secondary/30 rounded-lg">
                            <span className="text-muted-foreground text-sm">Default Policy</span>
                            <span className="text-2xl font-bold">
                              {formattedDevices.filter(d => {
                                const policy = policies.find(p => p.id === d.activePolicy);
                                return policy?.isDefault;
                              }).length}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium mb-2">Policy Distribution</h3>
                          {policies.map(policy => {
                            const deviceCount = formattedDevices.filter(d => d.activePolicy === policy.id).length;
                            return (
                              <div key={policy.id} className="flex items-center justify-between py-1.5 text-sm">
                                <div className="flex items-center gap-1.5">
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ 
                                      backgroundColor: policy.id === "default-policy" 
                                        ? "#2563eb" 
                                        : policy.id.includes("office") 
                                          ? "#059669" 
                                          : "#ea580c" 
                                    }}
                                  ></div>
                                  <span>{policy.name}</span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {deviceCount} device{deviceCount !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Map View - Now on the right */}
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <CardTitle>Policy & Device Location Overview</CardTitle>
                    <CardDescription>
                      View policy boundaries and current device locations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-[400px] relative">
                      <Map 
                        devices={mapData.devices}
                        geofences={mapData.geofences}
                        center={mapCenter} 
                        zoom={mapData.devices.length > 0 ? 13 : 10}
                      />
                      
                      {/* Map Legend */}
                      <div className="absolute bottom-4 left-4 bg-background/90 p-3 rounded-md shadow-md border border-border">
                        <h4 className="font-medium text-sm mb-2">Map Legend</h4>
                        <div className="space-y-1.5">
                          {policies.filter(p => !p.isDefault).map(policy => (
                            <div key={policy.id} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ 
                                  backgroundColor: policy.id.includes("office") 
                                    ? "#10b981" 
                                    : "#f97316" 
                                }}
                              ></div>
                              <span className="text-xs">{policy.name}</span>
                            </div>
                          ))}
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-xs">Device Location</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Alert For Devices Not Showing on Map */}
                      {formattedDevices.some(d => !d.location || d.location.is_stale) && (
                        <div className="absolute top-4 right-4 bg-background/90 p-3 rounded-md shadow-md border border-border max-w-[60%]">
                          <div className="flex items-center text-amber-600 gap-2 mb-1">
                            <AlertCircle className="h-4 w-4" />
                            <h4 className="font-medium text-sm">Location Notice</h4>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formattedDevices.filter(d => !d.location || d.location.is_stale).length} device(s) not shown on map due to missing or stale location data (older than 5 minutes).
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          )}
        </main>
      </div>
    </AuthCheck>
  );
};

export default Dashboard;
