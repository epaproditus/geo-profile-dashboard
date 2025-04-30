
import { useState } from "react";
import AuthCheck from "@/components/AuthCheck";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, MoreVertical, Search, Smartphone } from "lucide-react";

// Mock data
const mockDevices = [
  { 
    id: "dev1", 
    name: "iPhone 13", 
    type: "Mobile",
    owner: "John Doe",
    status: "Active",
    lastSeen: "2023-04-29T15:32:10",
    location: { latitude: 40.7128, longitude: -74.0060 },
    geofenceId: "geo1",
    profileId: "profile1" 
  },
  { 
    id: "dev2", 
    name: "Samsung S21", 
    type: "Mobile",
    owner: "Jane Smith",
    status: "Inactive",
    lastSeen: "2023-04-28T09:15:22",
    location: { latitude: 40.7282, longitude: -73.9942 },
    geofenceId: "geo2",
    profileId: "profile2" 
  },
  { 
    id: "dev3", 
    name: "iPad Pro", 
    type: "Tablet",
    owner: "Mark Johnson",
    status: "Active",
    lastSeen: "2023-04-29T14:05:18",
    location: { latitude: 40.7352, longitude: -74.0153 },
    geofenceId: null,
    profileId: "profile3" 
  },
  { 
    id: "dev4", 
    name: "MacBook Pro", 
    type: "Laptop",
    owner: "Sarah Williams",
    status: "Active",
    lastSeen: "2023-04-29T16:22:45",
    location: { latitude: 40.7128, longitude: -74.0060 },
    geofenceId: "geo1",
    profileId: "profile1" 
  },
];

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
  
  const filteredDevices = mockDevices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          device.owner.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = deviceTypeFilter === "all" || 
                        device.type.toLowerCase() === deviceTypeFilter.toLowerCase();
    
    return matchesSearch && matchesType;
  });

  const getProfileName = (profileId: string | null) => {
    if (!profileId) return "None";
    const profile = mockProfiles.find(p => p.id === profileId);
    return profile ? profile.name : "Unknown";
  };

  const getGeofenceName = (geofenceId: string | null) => {
    if (!geofenceId) return "None";
    const geofence = mockGeofences.find(g => g.id === geofenceId);
    return geofence ? geofence.name : "Unknown";
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 container mx-auto p-4 md:p-6">
          <h1 className="text-2xl font-bold mb-6">Devices</h1>
          
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Device Management</CardTitle>
                    <CardDescription>
                      {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''}
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Owner</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Seen</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Geofence</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Profile</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {filteredDevices.length > 0 ? (
                          filteredDevices.map((device) => (
                            <tr key={device.id}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <Smartphone className="h-5 w-5 text-muted-foreground mr-2" />
                                  <span className="font-medium">{device.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">{device.type}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">{device.owner}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  device.status === 'Active' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {device.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">{formatLastSeen(device.lastSeen)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <div className="flex items-center">
                                  {device.geofenceId && <MapPin className="h-3 w-3 text-primary mr-1" />}
                                  {getGeofenceName(device.geofenceId)}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">{getProfileName(device.profileId)}</td>
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
                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                    <DropdownMenuItem>Edit Device</DropdownMenuItem>
                                    <DropdownMenuItem>Assign Profile</DropdownMenuItem>
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
          </div>
        </main>
      </div>
    </AuthCheck>
  );
};

export default Devices;
