
import { useState } from "react";
import AuthCheck from "@/components/AuthCheck";
import Navbar from "@/components/Navbar";
import Map from "@/components/Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MapPin, Smartphone, Settings } from "lucide-react";

// Mock data
const mockGeofences = [
  { id: "geo1", name: "Office", latitude: 40.7128, longitude: -74.0060, radius: 100, profileId: "profile1" },
  { id: "geo2", name: "Warehouse", latitude: 40.7282, longitude: -73.9942, radius: 200, profileId: "profile2" },
];

const mockDevices = [
  { id: "dev1", name: "iPhone 13", latitude: 40.7128, longitude: -74.0060, profileId: "profile1" },
  { id: "dev2", name: "Samsung S21", latitude: 40.7282, longitude: -73.9942, profileId: "profile2" },
  { id: "dev3", name: "iPad Pro", latitude: 40.7352, longitude: -74.0153, profileId: null },
];

const mockProfiles = [
  { id: "profile1", name: "Standard Security", description: "Basic security settings" },
  { id: "profile2", name: "High Security", description: "Enhanced security with strict policies" },
  { id: "profile3", name: "Development", description: "Relaxed settings for development devices" },
];

const Dashboard = () => {
  const [selectedGeofence, setSelectedGeofence] = useState<string | null>(null);

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
                  Geofences
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
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Location Overview</CardTitle>
                  <CardDescription>View and manage geofences and device locations</CardDescription>
                </CardHeader>
                <CardContent>
                  <Map 
                    devices={mockDevices}
                    geofences={mockGeofences}
                    selectedGeofence={selectedGeofence}
                    onSelectGeofence={setSelectedGeofence}
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col p-3 bg-secondary/30 rounded-lg">
                        <span className="text-muted-foreground text-sm">Geofences</span>
                        <span className="text-2xl font-bold">{mockGeofences.length}</span>
                      </div>
                      <div className="flex flex-col p-3 bg-secondary/30 rounded-lg">
                        <span className="text-muted-foreground text-sm">Devices</span>
                        <span className="text-2xl font-bold">{mockDevices.length}</span>
                      </div>
                    </div>
                    <div className="flex flex-col p-3 bg-secondary/30 rounded-lg">
                      <span className="text-muted-foreground text-sm">Profiles</span>
                      <span className="text-2xl font-bold">{mockProfiles.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockDevices.map((device) => (
                      <div key={device.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="font-medium">{device.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {device.profileId 
                              ? `Profile: ${mockProfiles.find(p => p.id === device.profileId)?.name || 'Unknown'}`
                              : 'No profile assigned'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </AuthCheck>
  );
};

export default Dashboard;
