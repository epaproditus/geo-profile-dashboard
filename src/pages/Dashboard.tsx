import { useState, useEffect, useRef } from "react";
import AuthCheck from "@/components/AuthCheck";
import Navbar from "@/components/Navbar";
import Map from "@/components/Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow, differenceInMinutes } from "date-fns";
import { MapPin, Smartphone, Shield, RefreshCw, AlertCircle, MapPinOff, Wifi } from "lucide-react";
import { useDevices, useUpdateDeviceLocation } from "@/hooks/use-simplemdm";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isIpInRange } from "@/lib/utils";
import { getLocationFromIp, getLocationFromIpSync, GeoLocation } from "@/lib/utils/ip-geolocation";
import profilePolicyService from "@/lib/services/profile-policy-service";

// Constants for localStorage keys and location staleness
const POLICY_STORAGE_KEY = 'geo-profile-dashboard-policies';
const LOCATION_STALENESS_MINUTES = 10; // Location data is considered stale after 10 minutes

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
  ipRanges?: {
    displayName: string;
    ipAddress: string;  // Can be single IP or CIDR notation like "192.168.1.0/24"
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

// Helper function to determine if a device is within a policy's location - FOCUS ON IP
const isDeviceWithinPolicyLocation = (deviceIp: string | null, policy: ZonePolicy): boolean => {
  if (policy.isDefault) return false; // Default policy doesn't match by location
  
  // Check if device's IP matches any policy's IP ranges
  if (deviceIp && policy.ipRanges && policy.ipRanges.length > 0) {
    return policy.ipRanges.some(ipRange => {
      if (!ipRange.ipAddress) return false;
      const matches = isIpInRange(deviceIp, ipRange.ipAddress);
      console.log(`Checking if ${deviceIp} matches ${ipRange.ipAddress}: ${matches ? 'Yes' : 'No'}`);
      return matches;
    });
  }
  
  return false;
};

// Helper function to check if device's IP matches a policy's IP ranges
const isDeviceIpInPolicyRange = (deviceIp: string | null, policy: ZonePolicy): boolean => {
  if (!deviceIp || !policy.ipRanges || policy.ipRanges.length === 0) return false;
  
  return policy.ipRanges.some(ipRange => {
    if (!ipRange.ipAddress) return false;
    return isIpInRange(deviceIp, ipRange.ipAddress);
  });
};

// Helper function to check if location data is stale (older than LOCATION_STALENESS_MINUTES)
const isLocationStale = (locationTimestamp: Date): boolean => {
  // Check if the timestamp is more than LOCATION_STALENESS_MINUTES minutes old
  const minutesOld = differenceInMinutes(new Date(), locationTimestamp);
  return minutesOld > LOCATION_STALENESS_MINUTES;
};

// Helper function to get the active policy for a device - PRIORITIZE IP MATCHING
const getActivePolicyForDevice = (
  deviceData: {
    id: string;
    lastSeenIp?: string | null;
  }, 
  policies: ZonePolicy[]
): ZonePolicy | undefined => {
  const { id: deviceId, lastSeenIp } = deviceData;
  
  // REVISED PRIORITY: First check if device IP matches any policy's IP addresses
  if (lastSeenIp) {
    const ipBasedPolicies = policies.filter(p => 
      !p.isDefault && isDeviceWithinPolicyLocation(lastSeenIp, p)
    );
    
    if (ipBasedPolicies.length > 0) {
      console.log(`Device ${deviceId} matched policy ${ipBasedPolicies[0].name} by IP address`);
      // Return the first matching IP-based policy
      return ipBasedPolicies[0];
    }
  }
  
  // Next check if device is assigned to policies directly (second priority)
  const assignedPolicies = policies.filter(p => 
    p.devices.some(d => d.id === deviceId)
  );
  
  if (assignedPolicies.length > 0) {
    console.log(`Device ${deviceId} matched policy ${assignedPolicies[0].name} by direct assignment`);
    // If device is assigned to a policy directly, return the first one
    return assignedPolicies[0];
  }
  
  // If no match is found, return the default policy
  const defaultPolicy = policies.find(p => p.isDefault);
  console.log(`Device ${deviceId} using default policy ${defaultPolicy?.name}`);
  return defaultPolicy;
};

// Function to generate a consistent color based on IP address
const getIpBasedColor = (ip: string): string => {
  // Simple hash function to generate a consistent color from an IP
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ip.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Get a hue between 200 and 280 (blue-ish colors)
  const hue = 200 + (Math.abs(hash) % 80);
  return `hsl(${hue}, 70%, 60%)`;
};

const Dashboard = () => {
  const [policies, setPolicies] = useState<ZonePolicy[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [refreshingLocation, setRefreshingLocation] = useState<string | false>(false);
  const { toast } = useToast(); // Use the useToast hook
  
  // Store device IP addresses to detect changes
  const [deviceIpMap, setDeviceIpMap] = useState<Record<string, string>>({});
  
  // Polling interval reference for cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Configure how often we check for IP changes (in milliseconds)
  const IP_CHECK_INTERVAL_MS = 30000; // Check every 30 seconds
  
  // Show monitoring status in the Dashboard
  const [ipMonitoringActive, setIpMonitoringActive] = useState(false);
  
  // Check if IP monitoring is running
  useEffect(() => {
    // Check if we have an active interval for IP monitoring
    const isActive = pollingIntervalRef.current !== null;
    setIpMonitoringActive(isActive);
  }, [pollingIntervalRef.current]);
  
  // Function to toggle IP monitoring on/off
  const toggleIpMonitoring = () => {
    if (ipMonitoringActive && pollingIntervalRef.current) {
      // Turn off monitoring
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIpMonitoringActive(false);
      
      toast({
        title: "Network Monitoring Disabled",
        description: "Real-time network monitoring has been turned off.",
        duration: 3000,
      });
    } else {
      // Turn on monitoring
      pollingIntervalRef.current = setInterval(async () => {
        console.log('Checking for IP address changes...');
        
        // Fetch fresh device data
        const freshData = await refetchDevices();
        
        if (!freshData.data?.data) {
          console.log('No device data available in refresh');
          return;
        }
        
        // Check each device for IP changes
        for (const device of freshData.data.data) {
          const deviceId = device.id.toString();
          const currentIp = device.attributes.last_seen_ip;
          const previousIp = deviceIpMap[deviceId];
          
          // Skip devices without an IP
          if (!currentIp) continue;
          
          // Check if the IP has changed
          if (currentIp !== previousIp) {
            console.log(`Device ${deviceId} (${device.attributes.name}) IP changed from ${previousIp || 'none'} to ${currentIp}`);
            
            // Update the stored IP
            setDeviceIpMap(prev => ({
              ...prev,
              [deviceId]: currentIp
            }));
            
            try {
              // Process this device with the new IP
              const result = await profilePolicyService.processDeviceConnection(
                deviceId, 
                currentIp
              );
              
              // If profiles were pushed, show a toast notification
              if (result.policyApplied) {
                toast({
                  title: "Network Change Detected",
                  description: `Applied ${result.profilesPushed} profile(s) from "${result.policyName}" policy to device "${device.attributes.name}" based on new IP address.`,
                  duration: 5000,
                });
              }
            } catch (error) {
              console.error(`Error processing device ${deviceId} IP change:`, error);
            }
          }
        }
      }, IP_CHECK_INTERVAL_MS);
      
      setIpMonitoringActive(true);
      
      toast({
        title: "Network Monitoring Enabled",
        description: `Monitoring enabled. Checking device networks every ${IP_CHECK_INTERVAL_MS/1000} seconds.`,
        duration: 3000,
      });
    }
  };
  
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
  
  // Add effect to check for policy application when devices connect
  useEffect(() => {
    // Only run if we have device data and policies loaded
    if (!devicesData?.data || policies.length === 0) return;
    
    // Process each device to see if profiles need to be pushed
    const processDevices = async () => {
      for (const device of devicesData.data) {
        const deviceId = device.id.toString();
        const deviceIp = device.attributes.last_seen_ip;
        
        // Skip devices without an IP address
        if (!deviceIp) continue;
        
        try {
          // Process this device connection to apply the appropriate policy
          const result = await profilePolicyService.processDeviceConnection(
            deviceId, 
            deviceIp
          );
          
          // If profiles were pushed, show a toast notification
          if (result.policyApplied) {
            toast({
              title: "Profiles Applied",
              description: `Applied ${result.profilesPushed} profile(s) from "${result.policyName}" policy to device "${device.attributes.name}" based on IP address.`,
              duration: 5000,
            });
          }
        } catch (error) {
          console.error(`Error processing device ${deviceId} connection:`, error);
        }
      }
    };
    
    // Process devices
    processDevices();
    
    // We only want to run this when the deviceData or policies change
  }, [devicesData?.data, policies, toast]);
  
  // Add effect to continuously monitor device IP addresses
  useEffect(() => {
    // Only run if we have device data and policies loaded
    if (!devicesData?.data || policies.length === 0) return;
    
    // Initial processing of devices
    const processInitialDeviceData = async () => {
      // Create a map of current IP addresses
      const newDeviceIpMap: Record<string, string> = {};
      
      // Process each device
      for (const device of devicesData.data) {
        const deviceId = device.id.toString();
        const deviceIp = device.attributes.last_seen_ip;
        
        if (deviceIp) {
          // Store the current IP for later comparison
          newDeviceIpMap[deviceId] = deviceIp;
        }
      }
      
      // Update the IP map
      setDeviceIpMap(newDeviceIpMap);
    };
    
    // Process initial device data
    processInitialDeviceData();
    
    // Start polling for IP address changes
    pollingIntervalRef.current = setInterval(async () => {
      console.log('Checking for IP address changes...');
      
      // Fetch fresh device data
      const freshData = await refetchDevices();
      
      if (!freshData.data?.data) {
        console.log('No device data available in refresh');
        return;
      }
      
      // Check each device for IP changes
      for (const device of freshData.data.data) {
        const deviceId = device.id.toString();
        const currentIp = device.attributes.last_seen_ip;
        const previousIp = deviceIpMap[deviceId];
        
        // Skip devices without an IP
        if (!currentIp) continue;
        
        // Check if the IP has changed
        if (currentIp !== previousIp) {
          console.log(`Device ${deviceId} (${device.attributes.name}) IP changed from ${previousIp || 'none'} to ${currentIp}`);
          
          // Update the stored IP
          setDeviceIpMap(prev => ({
            ...prev,
            [deviceId]: currentIp
          }));
          
          try {
            // Process this device with the new IP
            const result = await profilePolicyService.processDeviceConnection(
              deviceId, 
              currentIp
            );
            
            // Show a toast notification based on what happened
            if (result.policyApplied) {
              // Create a more detailed notification that includes profile removals
              let description = `Applied ${result.profilesPushed} profile(s) from "${result.policyName}" policy to device "${device.attributes.name}"`;
              
              // Add info about removed profiles if any were removed
              if (result.profilesRemoved && result.profilesRemoved > 0) {
                description += ` and removed ${result.profilesRemoved} outdated profile(s)`;
              }
              
              description += ` based on new IP address.`;
              
              toast({
                title: "Network Change Detected",
                description: description,
                duration: 5000,
              });
            }
          } catch (error) {
            console.error(`Error processing device ${deviceId} IP change:`, error);
          }
        }
      }
    }, IP_CHECK_INTERVAL_MS);
    
    // Clean up interval on component unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [devicesData?.data, policies, toast, refetchDevices]);
  
  // Add a manual refresh button to sync UI with actual policy status
  const handleManualRefresh = async () => {
    // Force refresh the device data
    await refetchDevices();
    
    // Reload policies from localStorage (in case they were updated elsewhere)
    setPolicies(loadPoliciesFromLocalStorage());
    
    toast({
      title: "Dashboard Refreshed",
      description: "Device and policy information has been updated.",
      duration: 3000,
    });
  };

  // Format devices from the API response
  const formattedDevices = devicesData?.data?.map(device => {
    // Extract IP address data - primary location method now
    const lastSeenIp = device.attributes.last_seen_ip || null;
    
    // We're still extracting location data, but only for display purposes on the map
    const hasLocation = device.attributes.location_latitude && device.attributes.location_longitude;
    const latitude = hasLocation ? parseFloat(device.attributes.location_latitude || '0') : undefined;
    const longitude = hasLocation ? parseFloat(device.attributes.location_longitude || '0') : undefined;
    const locationTimestamp = device.attributes.location_updated_at ? new Date(device.attributes.location_updated_at) : null;
    
    // Determine active policy using only IP address and direct assignment
    const activePolicyObj = getActivePolicyForDevice(
      {
        id: device.id.toString(),
        lastSeenIp
      },
      policies
    );

    // Determine the matching reason for the policy
    let policyMatchReason: 'direct' | 'ip' | 'default' = 'default';
    if (activePolicyObj && !activePolicyObj.isDefault) {
      if (activePolicyObj.devices.some(d => d.id === device.id.toString())) {
        policyMatchReason = 'direct';
      } else if (lastSeenIp && activePolicyObj.ipRanges && 
                isDeviceIpInPolicyRange(lastSeenIp, activePolicyObj)) {
        policyMatchReason = 'ip';
      }
    }
    
    // Determine IP network name if policy is matched by IP
    let ipNetworkName = '';
    if (policyMatchReason === 'ip' && lastSeenIp && activePolicyObj?.ipRanges) {
      const matchingIpRange = activePolicyObj.ipRanges.find(range => 
        isIpInRange(lastSeenIp, range.ipAddress)
      );
      ipNetworkName = matchingIpRange?.displayName || '';
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
      lastSeenIp,
      // We still include location for map display
      location: hasLocation ? {
        latitude: latitude!,
        longitude: longitude!,
        accuracy: device.attributes.location_accuracy || 0,
        last_updated: locationTimestamp || new Date(),
        is_stale: isLocationStale(locationTimestamp!)
      } : undefined,
      activePolicy: activePolicyObj?.id,
      activePolicyObj,
      policyMatchReason,
      ipNetworkName
    };
  }) || [];
  
  // Format the map data for the Map component
  const mapData = {
    // Format geofences for policy boundaries - use IP-based locations where available
    geofences: [
      // Add IP-based policy locations 
      ...policies.flatMap(policy => 
        (policy.ipRanges || []).map(ipRange => {
          // Get geographic location from IP address
          const ipLocation = getLocationFromIp(ipRange.ipAddress);
          if (!ipLocation) return null;
          
          return {
            id: ipRange.geofenceId,
            name: `${policy.name}: ${ipRange.displayName} (IP Network)`,
            latitude: ipLocation.latitude,
            longitude: ipLocation.longitude,
            radius: ipLocation.accuracy || 100, // Use accuracy from IP geolocation or default to 100m
            color: "#2563eb", // Blue color for IP-based locations
            borderColor: "#1e40af", // Darker blue for borders
            profileId: null,
            zonePolicyId: policy.id
          };
        }).filter(Boolean)
      ),
      // Keep existing policy locations for reference (legacy)
      ...policies.flatMap(policy => 
        policy.locations.map(loc => ({
          id: loc.geofenceId,
          name: `${policy.name}: ${loc.displayName}`,
          latitude: loc.latitude,
          longitude: loc.longitude,
          radius: loc.radius,
          color: policy.id === "default-policy" ? "#3b82f680" : policy.id.includes("office") ? "#10b98180" : "#f9731680", // Semi-transparent
          borderColor: policy.id === "default-policy" ? "#2563eb80" : policy.id.includes("office") ? "#05966980" : "#ea580c80", // Semi-transparent
          profileId: null,
          zonePolicyId: policy.id
        }))
      ).filter(g => g.radius > 0), // Filter out default policy with radius 0
    ],
    
    // Format devices for the map - use IP location when available, fall back to GPS
    devices: formattedDevices.map(device => {
      // Always try to get location from IP first, even if GPS is available
      if (device.lastSeenIp) {
        const ipLocation = getLocationFromIp(device.lastSeenIp);
        
        if (ipLocation && ipLocation.latitude && ipLocation.longitude) {
          // Add more visual information to identify this as an IP-based location
          return {
            id: device.id,
            name: device.name,
            displayName: `${device.name} (Network Location)`,
            latitude: ipLocation.latitude,
            longitude: ipLocation.longitude,
            profileId: null,
            model: device.model,
            lastSeen: device.last_seen.toISOString(),
            locationType: 'ip', // Mark as IP-based location
            color: getIpBasedColor(device.lastSeenIp), // Get a consistent color based on the IP
            ipAddress: device.lastSeenIp,
            accuracy: ipLocation.accuracy || 3000, // Radius of accuracy circle in meters
            // Include matched policy info for tooltip
            policyName: device.activePolicyObj?.name,
            ipNetworkName: device.ipNetworkName
          };
        }
      }
      
      // Fall back to GPS location if available and not stale
      if (device.location && !device.location.is_stale) {
        return {
          id: device.id,
          name: device.name,
          displayName: `${device.name} (GPS)`,
          latitude: device.location.latitude,
          longitude: device.location.longitude,
          profileId: null,
          model: device.model,
          lastSeen: device.last_seen.toISOString(),
          locationType: 'gps', // Mark as GPS location
          color: '#FF3333', // Red for GPS locations
          accuracy: device.location.accuracy || 10 // GPS is usually more accurate
        };
      }
      
      // No valid location available
      return null;
    }).filter(Boolean) // Remove null entries
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
      const response = await updateDeviceLocation.mutateAsync(deviceId);
      
      // Check if the location update was requested
      if (response.locationUpdateRequested) {
        toast({
          title: "Location Update Requested",
          description: "The location update request has been sent to the device. It may take a few moments for the device to respond and update its location.",
          duration: 10000, // Show for 10 seconds
        });
      }
      
      // Wait a moment and then refetch to see if there's updated data
      setTimeout(() => {
        refetchDevices();
        setRefreshingLocation(false);
      }, 2000);
    } catch (error) {
      console.error('Error updating device location:', error);
      setRefreshingLocation(false);
      
      // Show error toast
      toast({
        title: "Location Update Failed",
        description: "Failed to request device location update. Please try again.",
        variant: "destructive",
      });
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleManualRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Dashboard
              </Button>
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
              <Button 
                variant={ipMonitoringActive ? "destructive" : "outline"} 
                size="sm" 
                onClick={toggleIpMonitoring}
              >
                {ipMonitoringActive ? (
                  <>
                    <Wifi className="h-4 w-4 mr-2" />
                    Stop Monitoring
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4 mr-2" />
                    Start Monitoring
                  </>
                )}
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
                                  {/* Policy Name Section */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <Shield className="h-3.5 w-3.5" style={{ color: borderColor }} />
                                      <span className="text-sm font-medium">{activePolicy?.name || "Default Policy"}</span>
                                    </div>
                                    <Badge 
                                      className="text-[10px]" 
                                      variant={device.policyMatchReason === 'ip' ? "default" : "secondary"}
                                    >
                                      {device.policyMatchReason === 'ip' ? "Network-based" : 
                                       device.policyMatchReason === 'direct' ? "Direct Assignment" : "Default"}
                                    </Badge>
                                  </div>
                                  
                                  {/* IP Address Information - Always show when available */}
                                  {device.lastSeenIp && (
                                    <div className="flex flex-col border-t border-border/40 pt-1.5 mt-1.5">
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-1.5">
                                          <Wifi className="h-3.5 w-3.5 text-blue-500" />
                                          <span className="text-xs font-mono">{device.lastSeenIp}</span>
                                        </div>
                                        <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-blue-300">
                                          Last checked: {formatDistanceToNow(new Date())} ago
                                        </Badge>
                                      </div>
                                      
                                      {/* Network Policy Info */}
                                      {device.policyMatchReason === 'ip' && device.ipNetworkName && (
                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                          Matched network: {device.ipNetworkName}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Policy Description - Simple explanation of what's happening */}
                                  <div className="text-xs text-muted-foreground">
                                    {device.policyMatchReason === 'direct' ? (
                                      "Device is directly assigned to this policy."
                                    ) : device.policyMatchReason === 'ip' ? (
                                      "Using network-based policy detection."
                                    ) : device.activePolicyObj?.isDefault ? (
                                      "Using default policy. No network match found."
                                    ) : (
                                      "Using policy based on device settings."
                                    )}
                                  </div>
                                  
                                  {/* Device Last Seen Info - Simplified without location focus */}
                                  <div className="flex items-center justify-between border-t border-border/40 pt-1.5 mt-1 text-xs text-muted-foreground">
                                    <span>
                                      Device last seen {formatDistanceToNow(device.last_seen)} ago
                                    </span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 px-2"
                                      onClick={() => handleRefreshLocation(device.id)}
                                      disabled={refreshingLocation === device.id}
                                    >
                                      <RefreshCw className={`h-3 w-3 mr-1 ${refreshingLocation === device.id ? "animate-spin" : ""}`} />
                                      Refresh
                                    </Button>
                                  </div>
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
                            {formattedDevices.filter(d => !d.location || d.location.is_stale).length} device(s) not shown on map due to missing or stale location data (older than 10 minutes).
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
