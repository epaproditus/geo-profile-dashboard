import { useState } from "react";
import AuthCheck from "@/components/AuthCheck";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, MoreVertical, RefreshCw, Search, Smartphone } from "lucide-react";
import { useDevices, useUpdateDeviceLocation } from "@/hooks/use-simplemdm";
import { format } from "date-fns";
import DeviceMap from "@/components/DeviceMap";
import DeviceDetailModal from "@/components/DeviceDetailModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, Map as MapIcon } from "lucide-react";

// Mock data for profiles and geofences until we implement those
const mockGeofences = [
  { id: "geo1", name: "Office", latitude: 40.7128, longitude: -74.0060, radius: 100, profileId: "profile1" },
  { id: "geo2", name: "Warehouse", latitude: 40.7282, longitude: -73.9942, radius: 200, profileId: "profile2" },
];

const mockProfiles = [
  { id: "profile1", name: "Standard Security", description: "Basic security settings" },
  { id: "profile2", name: "High Security", description: "Enhanced security with strict policies" },
  { id: "profile3", name: "Development", description: "Relaxed settings for development devices" },
];

const Devices = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { data: devicesData, isLoading, isError, refetch } = useDevices({ limit: 50 });
  const updateDeviceLocation = useUpdateDeviceLocation();

  // Function to handle refreshing a device's location
  const handleUpdateLocation = (deviceId: number | string) => {
    updateDeviceLocation.mutate(deviceId);
  };
  
  // Filter devices based on search query and device type
  const filteredDevices = devicesData?.data?.filter(device => {
    const deviceName = device.attributes.name || '';
    const modelName = device.attributes.model_name || '';
    
    const matchesSearch = 
      deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      modelName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Use model_name to filter by device type
    // This is a basic example, you might want to improve this based on your needs
    const type = device.attributes.model_name?.toLowerCase() || '';
    const matchesType = deviceTypeFilter === "all" || 
                       (deviceTypeFilter === "mobile" && (type.includes('iphone') || type.includes('android'))) ||
                       (deviceTypeFilter === "tablet" && (type.includes('ipad') || type.includes('tablet'))) ||
                       (deviceTypeFilter === "laptop" && (type.includes('mac') || type.includes('book')));
    
    return matchesSearch && matchesType;
  }) || [];

  // These are placeholder functions, to be replaced when we implement geofence and profile features
  const getProfileName = (device: any) => {
    // For now, just returning a placeholder. Will implement based on your profile structure.
    return "Standard Profile";
  };

  const getGeofenceName = (device: any) => {
    // For now, returning None. Will implement when geofence feature is added.
    return "None";
  };

  const getDeviceStatus = (device: any) => {
    return device.attributes.status === "enrolled" ? "Active" : device.attributes.status;
  };

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return "Never";
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy h:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 container mx-auto p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Devices</h1>
            <div className="flex gap-2">
              <div className="border rounded-md overflow-hidden flex">
                <Button 
                  variant={viewMode === "list" ? "default" : "ghost"} 
                  size="sm" 
                  className="rounded-none"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4 mr-2" />
                  List
                </Button>
                <Button 
                  variant={viewMode === "map" ? "default" : "ghost"} 
                  size="sm" 
                  className="rounded-none"
                  onClick={() => setViewMode("map")}
                >
                  <MapIcon className="h-4 w-4 mr-2" />
                  Map
                </Button>
              </div>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Devices
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {viewMode === "map" ? (
              // Map View
              <DeviceMap height="600px" />
            ) : (
              // List View
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle>Device Management</CardTitle>
                      <CardDescription>
                        {isLoading 
                          ? "Loading devices..." 
                          : isError 
                            ? "Error loading devices" 
                            : `${filteredDevices.length} device${filteredDevices.length !== 1 ? 's' : ''}`
                        }
                      </CardDescription>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="search"
                          placeholder="Search devices..."
                          className="pl-8 w-full md:w-[200px] lg:w-[300px]"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      
                      <Select value={deviceTypeFilter} onValueChange={setDeviceTypeFilter}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Device type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          <SelectItem value="mobile">Mobile</SelectItem>
                          <SelectItem value="tablet">Tablet</SelectItem>
                          <SelectItem value="laptop">Laptop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <div className="overflow-x-auto">
                      <table className="w-full divide-y divide-border">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Device</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Model</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Serial</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Seen</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Profile</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                          {isLoading ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                Loading devices...
                              </td>
                            </tr>
                          ) : isError ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                Error loading devices. Please refresh and try again.
                              </td>
                            </tr>
                          ) : filteredDevices.length > 0 ? (
                            filteredDevices.map((device) => (
                              <tr key={device.id}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <Smartphone className="h-5 w-5 text-muted-foreground mr-2" />
                                    <span className="font-medium">{device.attributes.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">{device.attributes.model_name}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">{device.attributes.serial_number || "Unknown"}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    device.attributes.status === 'enrolled' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {getDeviceStatus(device)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">{formatLastSeen(device.attributes.last_seen_at)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  <div className="flex items-center">
                                    {device.attributes.location_latitude && device.attributes.location_longitude ? (
                                      <>
                                        <MapPin className="h-3 w-3 text-primary mr-1" />
                                        {device.attributes.location_latitude.substring(0, 6)}, {device.attributes.location_longitude.substring(0, 6)}
                                      </>
                                    ) : (
                                      "No location data"
                                    )}
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="ml-1 h-6 w-6"
                                      onClick={() => handleUpdateLocation(device.id)}
                                      disabled={updateDeviceLocation.isPending && updateDeviceLocation.variables === device.id}
                                    >
                                      <RefreshCw className={`h-3 w-3 ${updateDeviceLocation.isPending && updateDeviceLocation.variables === device.id ? 'animate-spin' : ''}`} />
                                    </Button>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">{getProfileName(device)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => {
                                        setSelectedDeviceId(device.id);
                                        setIsDetailModalOpen(true);
                                      }}>
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleUpdateLocation(device.id)}>
                                        Update Location
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setViewMode("map")}>
                                        Show on Map
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>Add to Geofence</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-red-600">Remove Device</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                No devices found matching your filters
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
      
      {/* Device Detail Modal */}
      <DeviceDetailModal 
        deviceId={selectedDeviceId} 
        open={isDetailModalOpen} 
        onOpenChange={setIsDetailModalOpen} 
      />
    </AuthCheck>
  );
};

export default Devices;
