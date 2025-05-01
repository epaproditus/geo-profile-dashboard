import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Battery, 
  Smartphone, 
  Wifi, 
  MapPin, 
  RefreshCw, 
  Shield, 
  HardDrive,
  Server,
  AppWindow 
} from "lucide-react";
import { useDevice, useUpdateDeviceLocation } from "@/hooks/use-simplemdm";
import { SimpleMDMDevice } from "@/lib/api/simplemdm";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssignmentGroupSelector from "@/components/assignments/AssignmentGroupSelector";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

interface DeviceDetailModalProps {
  deviceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DeviceDetailModal = ({ deviceId, open, onOpenChange }: DeviceDetailModalProps) => {
  // Fetch device details when modal opens
  const { 
    data: deviceData, 
    isLoading, 
    refetch 
  } = useDevice(deviceId || "", { enabled: !!deviceId && open });
  
  const updateDeviceLocation = useUpdateDeviceLocation();
  
  // Request location update
  const handleUpdateLocation = () => {
    if (deviceId) {
      updateDeviceLocation.mutate(deviceId, {
        onSuccess: () => {
          refetch();
        }
      });
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy h:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };
  
  // Calculate battery percentage
  const getBatteryPercentage = (batteryLevel: string | null | undefined) => {
    if (!batteryLevel) return 0;
    return parseInt(batteryLevel.replace('%', '')) || 0;
  };
  
  // Battery color based on level
  const getBatteryColor = (percentage: number) => {
    if (percentage > 50) return "text-green-500";
    if (percentage > 20) return "text-orange-500";
    return "text-red-500";
  };
  
  const device = deviceData?.data;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        {isLoading ? (
          <>
            <DialogHeader>
              <DialogTitle>Loading Device Details</DialogTitle>
              <DialogDescription>Retrieving information from SimpleMDM...</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          </>
        ) : !device ? (
          <>
            <DialogHeader>
              <DialogTitle>Device Details</DialogTitle>
              <DialogDescription>Unable to load device information</DialogDescription>
            </DialogHeader>
            <div className="p-4 text-center text-muted-foreground">
              Failed to load device details
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="h-6 w-6 text-primary" />
                <DialogTitle className="text-xl">{device.attributes.name}</DialogTitle>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                <DialogDescription>
                  Device details and management options
                </DialogDescription>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="outline">{device.attributes.model_name}</Badge>
                  <Badge variant={device.attributes.status === "enrolled" ? "default" : "secondary"}>
                    {device.attributes.status === "enrolled" ? "Active" : device.attributes.status}
                  </Badge>
                  <Badge variant="outline">
                    Serial: {device.attributes.serial_number || "Unknown"}
                  </Badge>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Battery Status */}
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Battery className={`h-6 w-6 ${getBatteryColor(getBatteryPercentage(device.attributes.battery_level))}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Battery</div>
                        <div className="text-lg font-semibold">{device.attributes.battery_level || "Unknown"}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Storage Status */}
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <HardDrive className="h-6 w-6 text-blue-500" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Storage</div>
                        <div className="text-lg font-semibold">
                          {device.attributes.device_capacity 
                            ? `${Math.round((device.attributes.available_device_capacity / device.attributes.device_capacity) * 100)}% Free` 
                            : "Unknown"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* OS Version */}
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Server className="h-6 w-6 text-indigo-500" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">OS Version</div>
                        <div className="text-lg font-semibold truncate">{device.attributes.os_version || "Unknown"}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Tabs for different sections */}
              <Tabs defaultValue="details" className="mt-6">
                <TabsList className="mb-4">
                  <TabsTrigger value="details">Device Details</TabsTrigger>
                  <TabsTrigger value="apps">
                    <AppWindow className="h-4 w-4 mr-2" />
                    Apps
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="details">
                  {/* Main Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Core Information */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        Core Information
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">Name</div>
                        <div>{device.attributes.name}</div>
                        
                        <div className="text-muted-foreground">Model</div>
                        <div>{device.attributes.model_name}</div>
                        
                        <div className="text-muted-foreground">Serial Number</div>
                        <div>{device.attributes.serial_number || "N/A"}</div>
                        
                        <div className="text-muted-foreground">Status</div>
                        <div>{device.attributes.status}</div>
                        
                        <div className="text-muted-foreground">Last Seen</div>
                        <div>{formatDate(device.attributes.last_seen_at)}</div>
                        
                        <div className="text-muted-foreground">Enrolled</div>
                        <div>{formatDate(device.attributes.enrolled_at)}</div>
                        
                        <div className="text-muted-foreground">Total Storage</div>
                        <div>{device.attributes.device_capacity ? `${device.attributes.device_capacity.toFixed(2)} GB` : "Unknown"}</div>
                        
                        <div className="text-muted-foreground">Available Storage</div>
                        <div>{device.attributes.available_device_capacity ? `${device.attributes.available_device_capacity.toFixed(2)} GB` : "Unknown"}</div>
                      </div>
                    </div>
                    
                    {/* Location Information */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Location
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 ml-auto"
                          onClick={handleUpdateLocation}
                          disabled={updateDeviceLocation.isPending && updateDeviceLocation.variables === deviceId}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${updateDeviceLocation.isPending && updateDeviceLocation.variables === deviceId ? 'animate-spin' : ''}`} />
                          Update
                        </Button>
                      </h3>
                      {device.attributes.location_latitude && device.attributes.location_longitude ? (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted-foreground">Latitude</div>
                          <div>{device.attributes.location_latitude}</div>
                          
                          <div className="text-muted-foreground">Longitude</div>
                          <div>{device.attributes.location_longitude}</div>
                          
                          <div className="text-muted-foreground">Accuracy</div>
                          <div>{device.attributes.location_accuracy ? `${device.attributes.location_accuracy} meters` : "Unknown"}</div>
                          
                          <div className="text-muted-foreground">Last Updated</div>
                          <div>{formatDate(device.attributes.location_updated_at)}</div>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground border rounded-md">
                          <MapPin className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                          <div>No location data available</div>
                          <div className="text-xs mt-1">Click "Update" to request location</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Network Information */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Wifi className="h-5 w-5" />
                        Network
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">IP Address</div>
                        <div>{device.attributes.last_seen_ip || "Unknown"}</div>
                        
                        <div className="text-muted-foreground">Wi-Fi MAC</div>
                        <div>{device.attributes.wifi_mac || "Unknown"}</div>
                        
                        <div className="text-muted-foreground">Current Network</div>
                        <div>{device.attributes.current_carrier_network || "None"}</div>
                        
                        <div className="text-muted-foreground">Roaming</div>
                        <div>{device.attributes.is_roaming ? "Yes" : "No"}</div>
                        
                        <div className="text-muted-foreground">Hotspot</div>
                        <div>{device.attributes.personal_hotspot_enabled === null ? "Unknown" : device.attributes.personal_hotspot_enabled ? "Yes" : "No"}</div>
                      </div>
                    </div>
                    
                    {/* System Information */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Security & System
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">Supervised</div>
                        <div>{device.attributes.is_supervised ? "Yes" : "No"}</div>
                        
                        <div className="text-muted-foreground">DEP Enrolled</div>
                        <div>{device.attributes.dep_enrolled ? "Yes" : "No"}</div>
                        
                        <div className="text-muted-foreground">Passcode Present</div>
                        <div>{device.attributes.passcode_present ? "Yes" : "No"}</div>
                        
                        <div className="text-muted-foreground">Device Locator</div>
                        <div>{device.attributes.is_device_locator_service_enabled ? "Enabled" : "Disabled"}</div>
                        
                        <div className="text-muted-foreground">Cloud Backup</div>
                        <div>{device.attributes.is_cloud_backup_enabled ? "Enabled" : "Disabled"}</div>
                        
                        <div className="text-muted-foreground">Lost Mode</div>
                        <div>{device.attributes.lost_mode_enabled ? "Enabled" : "Disabled"}</div>
                      </div>
                    </div>
                    
                    {/* Identifiers */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Device Identifiers</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">IMEI</div>
                        <div>{device.attributes.imei || "N/A"}</div>
                        
                        <div className="text-muted-foreground">MEID</div>
                        <div>{device.attributes.meid || "N/A"}</div>
                        
                        <div className="text-muted-foreground">Unique ID</div>
                        <div className="truncate">{device.attributes.unique_identifier || "Unknown"}</div>
                        
                        <div className="text-muted-foreground">Bluetooth MAC</div>
                        <div>{device.attributes.bluetooth_mac || "Unknown"}</div>
                      </div>
                    </div>
                    
                    {/* Cellular Information */}
                    {device.attributes.service_subscriptions && device.attributes.service_subscriptions.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Cellular Plan</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted-foreground">Label</div>
                          <div>{device.attributes.service_subscriptions[0].label || "Primary"}</div>
                          
                          <div className="text-muted-foreground">Phone Number</div>
                          <div>{device.attributes.service_subscriptions[0].phone_number || "None"}</div>
                          
                          <div className="text-muted-foreground">Carrier</div>
                          <div>{device.attributes.service_subscriptions[0].current_carrier_network || "Unknown"}</div>
                          
                          <div className="text-muted-foreground">ICCID</div>
                          <div className="truncate">{device.attributes.service_subscriptions[0].iccid || "Unknown"}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="apps">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <AppWindow className="h-5 w-5" />
                      App Management
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Install apps on this device using SimpleMDM assignment groups. 
                      Assignment groups allow you to associate apps with devices and device groups.
                    </p>
                    
                    <AssignmentGroupSelector deviceId={deviceId} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeviceDetailModal;