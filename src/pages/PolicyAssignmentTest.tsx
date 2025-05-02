import { useState } from "react";
import AuthCheck from "@/components/AuthCheck";
import Navbar from "@/components/Navbar";
import Map from "@/components/Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Shield, Smartphone, Check, Info, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Mock data for the demo
const mockDevices = [
  {
    id: "iphone-1",
    name: "iPhone",
    model: "iPhone 13 mini",
    os_version: "iOS 18.3.2",
    supervised: true,
    battery: "33%",
    storageUsed: "42.9",
    storageTotal: "128",
    phone_number: "+1 (956) 329-4317",
    carrier: "Visible",
    online: true,
    last_seen: new Date(),
    location: {
      latitude: 26.30169,
      longitude: -98.18092,
      accuracy: 26,
      last_updated: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
    }
  },
  {
    id: "ipad-1",
    name: "iPad Pro",
    model: "iPad Pro (11-inch)",
    os_version: "iOS 18.3",
    supervised: true,
    battery: "1%",
    storageUsed: "60.4",
    storageTotal: "128",
    phone_number: null,
    carrier: null,
    online: false,
    last_seen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4), // 4 days ago
    location: null
  }
];

const mockPolicies = [
  {
    id: "default-policy",
    name: "Default (Fallback) Policy",
    description: "Applied when devices are outside all defined locations",
    isDefault: true,
    locations: [
      {
        displayName: "Global Default Location",
        latitude: 0,
        longitude: 0,
        radius: 0,
        geofenceId: "default-geofence"
      }
    ],
    devices: [mockDevices[0], mockDevices[1]],
    profiles: [{
      id: "wifi-profile",
      name: "Global WiFi"
    }]
  },
  {
    id: "secure-policy",
    name: "Secure 🔒",
    description: "Applied in secure facilities",
    isDefault: false,
    locations: [
      {
        displayName: "Secure Facility",
        latitude: 26.30169,
        longitude: -98.18092,
        radius: 500,
        geofenceId: "secure-geofence"
      }
    ],
    devices: [mockDevices[0]],
    profiles: [{
      id: "secure-wifi",
      name: "Secure Facility WiFi"
    }]
  }
];

// Helper function to determine if a device is within a policy's location
const isDeviceWithinPolicyLocation = (device: any, policy: any) => {
  if (!device.location) return false;
  if (policy.isDefault) return false; // Default policy doesn't match by location
  
  // For this demo, we'll assume the iPhone is within the Secure policy location
  return device.id === "iphone-1" && policy.id === "secure-policy";
};

// Helper function to determine which policy is currently applied to a device
const getActivePolicy = (device: any) => {
  if (!device.location) {
    // No location data, fallback to default policy
    return mockPolicies.find(p => p.isDefault);
  }
  
  // Check if device is within any specific policy location
  const matchingPolicy = mockPolicies.find(policy => 
    !policy.isDefault && isDeviceWithinPolicyLocation(device, policy)
  );
  
  // Return matching policy or fallback to default
  return matchingPolicy || mockPolicies.find(p => p.isDefault);
};

// Component for approach 1: Visual map with device and policy boundaries
const VisualMapApproach = () => {
  const device = mockDevices[0]; // iPhone
  const activePolicy = getActivePolicy(device);
  
  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Current Device Location</CardTitle>
          <CardDescription>
            Visual representation of policy boundaries and device location
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[400px] relative">
            <Map
              geofences={mockPolicies.filter(p => !p.isDefault).flatMap(p => 
                p.locations.map(loc => ({
                  id: loc.geofenceId,
                  name: loc.displayName,
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                  radius: loc.radius,
                  profileId: null,
                  zonePolicyId: p.id,
                  color: p.id === activePolicy?.id ? "rgba(34, 197, 94, 0.2)" : "rgba(100, 116, 139, 0.2)",
                  borderColor: p.id === activePolicy?.id ? "#16a34a" : "#64748b" 
                }))
              )}
              center={[device.location.longitude, device.location.latitude]}
              zoom={14}
              showDeviceLocation={true}
              deviceLocation={{
                latitude: device.location.latitude,
                longitude: device.location.longitude,
                accuracy: device.location.accuracy
              }}
            />
            
            {/* Overlay showing active policy */}
            <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-md shadow-md border border-gray-200 dark:border-gray-700 max-w-[250px]">
              <div className="flex items-center gap-2 mb-2">
                <Shield className={`h-5 w-5 ${activePolicy?.isDefault ? "text-blue-500" : "text-green-500"}`} />
                <span className="font-medium">{activePolicy?.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {activePolicy?.description}
              </p>
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs">
                <div className="flex gap-1">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">Active</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Component for approach 2: Policy comparison table
const PolicyComparisonApproach = () => {
  const device = mockDevices[0]; // iPhone
  const activePolicy = getActivePolicy(device);
  
  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Policy Assignment</CardTitle>
            <Badge variant="outline" className="gap-1">
              <Smartphone className="h-3.5 w-3.5 mr-1" />
              {device.name}
            </Badge>
          </div>
          <CardDescription>
            Comparison of policies that might apply to this device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="px-4 py-2 text-left">Policy</th>
                  <th className="px-4 py-2 text-left">Location Match</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {mockPolicies.map(policy => (
                  <tr 
                    key={policy.id}
                    className={`border-b last:border-0 ${policy.id === activePolicy?.id ? "bg-green-50 dark:bg-green-900/20" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Shield className={`h-4 w-4 ${policy.isDefault ? "text-blue-500" : "text-primary"}`} />
                        <span className="font-medium">{policy.name}</span>
                        {policy.isDefault && (
                          <Badge variant="outline" size="sm" className="text-xs ml-1">Default</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {policy.isDefault ? (
                        <span className="text-muted-foreground">Fallback (always applies)</span>
                      ) : (
                        isDeviceWithinPolicyLocation(device, policy) ? (
                          <Badge variant="outline" className="bg-green-100 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-800 dark:text-green-200">
                            Within boundary
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
                            Outside boundary
                          </Badge>
                        )
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {policy.id === activePolicy?.id ? (
                        <Badge variant="outline" className="bg-green-100 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-800 dark:text-green-200">
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm">
                        <Info className="h-3.5 w-3.5 mr-1" />
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Currently Active: </span>
            {activePolicy?.name}
          </div>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

// Component for approach 3: Device-centric unified view
const DeviceCentricApproach = () => {
  const device = mockDevices[0]; // iPhone
  const activePolicy = getActivePolicy(device);
  
  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                {device.name}
                {device.online ? (
                  <Badge variant="outline" className="ml-2 text-xs border-green-500 text-green-600">
                    Online
                  </Badge>
                ) : (
                  <Badge variant="outline" className="ml-2 text-xs border-orange-500 text-orange-600">
                    Last seen {formatDistanceToNow(device.last_seen)} ago
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{device.model} • {device.os_version}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Device Details */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-secondary/20 rounded-md">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium">{device.supervised ? "Supervised" : "Unsupervised"}</p>
            </div>
            <div className="p-3 bg-secondary/20 rounded-md">
              <p className="text-xs text-muted-foreground">Battery</p>
              <p className="font-medium">{device.battery}</p>
            </div>
            <div className="p-3 bg-secondary/20 rounded-md">
              <p className="text-xs text-muted-foreground">Storage</p>
              <p className="font-medium">{device.storageUsed} GB of {device.storageTotal} GB</p>
            </div>
          </div>
          
          <Separator />
          
          {/* Active Policy Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Active Policy</h3>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Update Location
              </Button>
            </div>
            
            <Card className={`border-2 ${activePolicy?.isDefault ? "border-blue-500" : "border-green-500"}`}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className={`h-4 w-4 ${activePolicy?.isDefault ? "text-blue-500" : "text-green-500"}`} />
                    {activePolicy?.name}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {activePolicy?.isDefault ? "Default Policy" : "Location-based Policy"}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="py-0 px-4">
                <p className="text-sm text-muted-foreground">
                  {activePolicy?.description}
                </p>
                
                {activePolicy && !activePolicy.isDefault && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Location Match</span>
                      <Badge variant="outline" className="ml-auto text-xs bg-green-100 border-green-200 text-green-800 dark:bg-green-900 dark:border-green-800 dark:text-green-200">
                        Inside
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Device is within the "{activePolicy.locations[0].displayName}" boundary
                    </p>
                  </div>
                )}
                
                {activePolicy && activePolicy.isDefault && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Default Policy</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This policy is applied when the device is outside all defined policy locations
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="py-3 text-xs text-muted-foreground border-t">
                <div className="w-full flex justify-between">
                  <span>Profiles: {activePolicy?.profiles.length}</span>
                  <span>Updated: {formatDistanceToNow(new Date())} ago</span>
                </div>
              </CardFooter>
            </Card>
          </div>
          
          {/* Available Policies Section */}
          <div>
            <h3 className="font-medium mb-3">All Available Policies</h3>
            
            <div className="space-y-2">
              {mockPolicies.map(policy => (
                <div 
                  key={policy.id}
                  className={`p-3 border rounded-md flex items-center justify-between ${
                    policy.id === activePolicy?.id 
                      ? `bg-${policy.isDefault ? "blue" : "green"}-50 dark:bg-${policy.isDefault ? "blue" : "green"}-900/20` 
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className={`h-4 w-4 ${policy.isDefault ? "text-blue-500" : "text-primary"}`} />
                    <span className="font-medium">{policy.name}</span>
                    {policy.isDefault && (
                      <Badge variant="outline" size="sm" className="text-xs">Default</Badge>
                    )}
                  </div>
                  
                  {policy.id === activePolicy?.id ? (
                    <Badge className="bg-green-500">
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const PolicyAssignmentTest = () => {
  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 container mx-auto p-4 md:p-6">
          <div className="flex flex-col md:items-center justify-between mb-6 gap-2">
            <h1 className="text-2xl font-bold">Policy Assignment Visualization Test</h1>
            <p className="text-muted-foreground">
              Three different approaches to visualize which policy is being applied to a device
            </p>
          </div>
          
          <Tabs defaultValue="visual-map" className="w-full">
            <TabsList className="w-full mb-6 grid grid-cols-3">
              <TabsTrigger value="visual-map">1: Visual Map</TabsTrigger>
              <TabsTrigger value="policy-comparison">2: Policy Comparison</TabsTrigger>
              <TabsTrigger value="device-centric">3: Device-Centric</TabsTrigger>
            </TabsList>
            
            <TabsContent value="visual-map">
              <h2 className="text-xl font-semibold mb-4">Approach 1: Visual Map</h2>
              <p className="text-muted-foreground mb-6">
                Shows the device's current location on a map with policy boundaries, making it easy to see
                which policy's geofence the device is currently within.
              </p>
              
              <VisualMapApproach />
            </TabsContent>
            
            <TabsContent value="policy-comparison">
              <h2 className="text-xl font-semibold mb-4">Approach 2: Policy Comparison Table</h2>
              <p className="text-muted-foreground mb-6">
                Shows all policies that could apply to the device with a clear indication of which one is active
                and why (location match or default fallback).
              </p>
              
              <PolicyComparisonApproach />
            </TabsContent>
            
            <TabsContent value="device-centric">
              <h2 className="text-xl font-semibold mb-4">Approach 3: Device-Centric View</h2>
              <p className="text-muted-foreground mb-6">
                Focuses on the device first, then clearly indicates which policy is currently active and why,
                with a list of all potential policies below.
              </p>
              
              <DeviceCentricApproach />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthCheck>
  );
};

export default PolicyAssignmentTest;