import { useState } from "react";
import AuthCheck from "@/components/AuthCheck";
import Navbar from "@/components/Navbar";
import Map from "@/components/Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Shield, Smartphone, ChevronDown, ChevronUp, Info } from "lucide-react";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// Mock data for testing
const mockPolicies = [
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
        radius: 1000,
        geofenceId: "default-geofence"
      }
    ],
    devices: [], 
    profiles: [] 
  },
  { 
    id: "office-policy", 
    name: "Office Building Policy", 
    description: "Applied when in the main office", 
    isDefault: false,
    locations: [
      {
        displayName: "San Francisco HQ",
        latitude: 37.7935,
        longitude: -122.3964,
        radius: 200,
        geofenceId: "office-geofence"
      },
      {
        displayName: "Engineering Building",
        latitude: 37.7935,
        longitude: -122.3984,
        radius: 150,
        geofenceId: "engineering-geofence"
      }
    ],
    devices: [
      { id: "device1", name: "John's iPhone" },
      { id: "device2", name: "Marketing iPad" },
      { id: "device3", name: "Developer MacBook" }
    ], 
    profiles: [
      { id: "profile1", name: "Office WiFi" },
      { id: "profile2", name: "VPN Configuration" }
    ] 
  }
];

// Simple Map placeholder
const SimpleMap = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  return (
    <div className="w-full h-full min-h-[180px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
      <p className="text-muted-foreground">Map at {center[1]}, {center[0]} (zoom: {zoom})</p>
    </div>
  );
};

// Standard Card Layout (original implementation)
const OriginalPolicyCard = ({ policy }: { policy: any }) => {
  return (
    <Card className={policy.isDefault ? "border-primary" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-medium">{policy.name}</CardTitle>
            {policy.isDefault && (
              <Badge variant="outline" className="mt-1 text-xs border-primary text-primary">
                Default Policy
              </Badge>
            )}
          </div>
          <Badge variant="secondary">
            {policy.locations.length} location{policy.locations.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <CardDescription>{policy.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Display all locations for the policy with maps on the right side */}
          {policy.locations.map((location: any, index: number) => (
            <div key={index} className="border rounded-lg overflow-hidden bg-secondary/5">
              {/* Flex container for side-by-side layout */}
              <div className="flex flex-col md:flex-row">
                {/* Location information on the left */}
                <div className="p-4 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      Location {policy.locations.length > 1 ? index + 1 : ''}
                    </span>
                    {policy.isDefault && index === 0 && (
                      <Badge variant="outline" className="text-xs">
                        Fallback Policy
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm space-y-1">
                    <p>{location.displayName}</p>
                    <p className="text-muted-foreground">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                    <p className="text-muted-foreground">
                      Radius: {location.radius}m
                    </p>
                  </div>
                </div>
                
                {/* Map on the right */}
                <div className="md:w-2/3 h-[180px] md:h-auto">
                  <SimpleMap
                    center={[location.longitude, location.latitude]}
                    zoom={13}
                  />
                </div>
              </div>
            </div>
          ))}
          
          {policy.isDefault && (
            <p className="text-xs text-muted-foreground italic">
              This policy will apply when a device is outside all other defined locations.
            </p>
          )}

          {/* Display attached devices if any */}
          {policy.devices.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Attached Devices ({policy.devices.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {policy.devices.map((device: any) => (
                  <div 
                    key={device.id}
                    className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs flex items-center gap-1"
                  >
                    <span>{device.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Display configuration profiles if any */}
          {policy.profiles.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Configuration Profiles ({policy.profiles.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {policy.profiles.map((profile: any) => (
                  <div 
                    key={profile.id}
                    className="bg-primary/10 text-primary rounded-md px-2 py-1 text-xs flex items-center gap-1"
                  >
                    <span>{profile.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button variant="outline" className="flex-1">
          <Shield className="h-4 w-4 mr-2" />
          Edit Policy Settings
        </Button>
        <Button variant={policy.isDefault ? "ghost" : "destructive"} size="icon" disabled={policy.isDefault}>
          <Info className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

// Collapsible Card Layout (Option 1 - Section Collapsibles)
const CollapsiblePolicyCard = ({ policy }: { policy: any }) => {
  const [openLocationSection, setOpenLocationSection] = useState(true);
  const [openDeviceSection, setOpenDeviceSection] = useState(true);
  const [openProfileSection, setOpenProfileSection] = useState(true);
  
  return (
    <Card className={policy.isDefault ? "border-primary" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-medium">{policy.name}</CardTitle>
            {policy.isDefault && (
              <Badge variant="outline" className="mt-1 text-xs border-primary text-primary">
                Default Policy
              </Badge>
            )}
          </div>
          <Badge variant="secondary">
            {policy.locations.length} location{policy.locations.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <CardDescription>{policy.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Collapsible Locations Section */}
          <Collapsible open={openLocationSection} onOpenChange={setOpenLocationSection} className="border rounded-lg overflow-hidden">
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between text-left bg-secondary/10 hover:bg-secondary/20">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Locations ({policy.locations.length})</span>
              </div>
              {openLocationSection ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="space-y-4 p-4 pt-0">
                {policy.locations.map((location: any, index: number) => (
                  <div key={index} className="border rounded-lg overflow-hidden bg-secondary/5 mt-4">
                    <div className="flex flex-col md:flex-row">
                      <div className="p-4 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            Location {policy.locations.length > 1 ? index + 1 : ''}
                          </span>
                          {policy.isDefault && index === 0 && (
                            <Badge variant="outline" className="text-xs">
                              Fallback Policy
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <p>{location.displayName}</p>
                          <p className="text-muted-foreground">
                            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                          </p>
                          <p className="text-muted-foreground">
                            Radius: {location.radius}m
                          </p>
                        </div>
                      </div>
                      
                      <div className="md:w-2/3 h-[180px] md:h-auto">
                        <SimpleMap
                          center={[location.longitude, location.latitude]}
                          zoom={13}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {policy.isDefault && (
                  <p className="text-xs text-muted-foreground italic px-4 py-2">
                    This policy will apply when a device is outside all other defined locations.
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Collapsible Devices Section */}
          {policy.devices.length > 0 && (
            <Collapsible open={openDeviceSection} onOpenChange={setOpenDeviceSection} className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between text-left bg-secondary/10 hover:bg-secondary/20">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Attached Devices ({policy.devices.length})</span>
                </div>
                {openDeviceSection ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {policy.devices.map((device: any) => (
                      <div 
                        key={device.id}
                        className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs flex items-center gap-1"
                      >
                        <span>{device.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
          
          {/* Collapsible Profiles Section */}
          {policy.profiles.length > 0 && (
            <Collapsible open={openProfileSection} onOpenChange={setOpenProfileSection} className="border rounded-lg overflow-hidden">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between text-left bg-secondary/10 hover:bg-secondary/20">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Configuration Profiles ({policy.profiles.length})</span>
                </div>
                {openProfileSection ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {policy.profiles.map((profile: any) => (
                      <div 
                        key={profile.id}
                        className="bg-primary/10 text-primary rounded-md px-2 py-1 text-xs flex items-center gap-1"
                      >
                        <span>{profile.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button variant="outline" className="flex-1">
          <Shield className="h-4 w-4 mr-2" />
          Edit Policy Settings
        </Button>
        <Button variant={policy.isDefault ? "ghost" : "destructive"} size="icon" disabled={policy.isDefault}>
          <Info className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

// Accordion Card Layout (Option 2)
const AccordionPolicyCard = ({ policy }: { policy: any }) => {
  return (
    <Card className={policy.isDefault ? "border-primary" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-medium">{policy.name}</CardTitle>
            {policy.isDefault && (
              <Badge variant="outline" className="mt-1 text-xs border-primary text-primary">
                Default Policy
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {policy.devices.length > 0 && (
              <Badge variant="secondary">
                {policy.devices.length} device{policy.devices.length !== 1 ? 's' : ''}
              </Badge>
            )}
            <Badge variant="secondary">
              {policy.locations.length} location{policy.locations.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
        <CardDescription>{policy.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="locations" className="border-b-0">
            <AccordionTrigger className="py-2 hover:no-underline">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Locations ({policy.locations.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {policy.locations.map((location: any, index: number) => (
                  <div key={index} className="border rounded-lg overflow-hidden bg-secondary/5">
                    <div className="flex flex-col md:flex-row">
                      <div className="p-4 flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            Location {policy.locations.length > 1 ? index + 1 : ''}
                          </span>
                          {policy.isDefault && index === 0 && (
                            <Badge variant="outline" className="text-xs">
                              Fallback Policy
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <p>{location.displayName}</p>
                          <p className="text-muted-foreground">
                            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                          </p>
                          <p className="text-muted-foreground">
                            Radius: {location.radius}m
                          </p>
                        </div>
                      </div>
                      
                      <div className="md:w-2/3 h-[180px] md:h-auto">
                        <SimpleMap
                          center={[location.longitude, location.latitude]}
                          zoom={13}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {policy.isDefault && (
                  <p className="text-xs text-muted-foreground italic">
                    This policy will apply when a device is outside all other defined locations.
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {policy.devices.length > 0 && (
            <AccordionItem value="devices" className="border-b-0">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Attached Devices ({policy.devices.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {policy.devices.map((device: any) => (
                    <div 
                      key={device.id}
                      className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs flex items-center gap-1"
                    >
                      <span>{device.name}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
          
          {policy.profiles.length > 0 && (
            <AccordionItem value="profiles" className="border-b-0">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Configuration Profiles ({policy.profiles.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {policy.profiles.map((profile: any) => (
                    <div 
                      key={profile.id}
                      className="bg-primary/10 text-primary rounded-md px-2 py-1 text-xs flex items-center gap-1"
                    >
                      <span>{profile.name}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button variant="outline" className="flex-1">
          <Shield className="h-4 w-4 mr-2" />
          Edit Policy Settings
        </Button>
        <Button variant={policy.isDefault ? "ghost" : "destructive"} size="icon" disabled={policy.isDefault}>
          <Info className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

// TabsPolicyCard (Option 3)
const TabsPolicyCard = ({ policy }: { policy: any }) => {
  return (
    <Card className={policy.isDefault ? "border-primary h-full" : "h-full"}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-medium">{policy.name}</CardTitle>
            {policy.isDefault && (
              <Badge variant="outline" className="mt-1 text-xs border-primary text-primary">
                Default Policy
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {policy.profiles.length > 0 && (
              <Badge variant="outline" className="bg-primary/10 border-primary/10">
                {policy.profiles.length} profile{policy.profiles.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {policy.devices.length > 0 && (
              <Badge variant="outline" className="bg-secondary border-secondary/10">
                {policy.devices.length} device{policy.devices.length !== 1 ? 's' : ''}
              </Badge>
            )}
            <Badge variant="secondary">
              {policy.locations.length} location{policy.locations.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
        <CardDescription>{policy.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="pb-0">
        <Tabs defaultValue="locations" className="w-full">
          <TabsList className="grid w-full" style={{ 
            gridTemplateColumns: `repeat(${policy.profiles.length > 0 ? '3' : policy.devices.length > 0 ? '2' : '1'}, 1fr)` 
          }}>
            <TabsTrigger value="locations">
              <MapPin className="h-4 w-4 mr-2" />
              Locations ({policy.locations.length})
            </TabsTrigger>
            
            {policy.devices.length > 0 && (
              <TabsTrigger value="devices">
                <Smartphone className="h-4 w-4 mr-2" />
                Devices ({policy.devices.length})
              </TabsTrigger>
            )}
            
            {policy.profiles.length > 0 && (
              <TabsTrigger value="profiles">
                <Shield className="h-4 w-4 mr-2" />
                Profiles ({policy.profiles.length})
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="locations" className="pt-4">
            <div className="space-y-4">
              {policy.locations.map((location: any, index: number) => (
                <div key={index} className="border rounded-lg overflow-hidden bg-secondary/5">
                  <div className="flex flex-col md:flex-row">
                    <div className="p-4 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          Location {policy.locations.length > 1 ? index + 1 : ''}
                        </span>
                        {policy.isDefault && index === 0 && (
                          <Badge variant="outline" className="text-xs">
                            Fallback Policy
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm space-y-1">
                        <p>{location.displayName}</p>
                        <p className="text-muted-foreground">
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </p>
                        <p className="text-muted-foreground">
                          Radius: {location.radius}m
                        </p>
                      </div>
                    </div>
                    
                    <div className="md:w-2/3 h-[180px] md:h-auto">
                      <SimpleMap
                        center={[location.longitude, location.latitude]}
                        zoom={13}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {policy.isDefault && (
                <p className="text-xs text-muted-foreground italic">
                  This policy will apply when a device is outside all other defined locations.
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="devices" className="pt-4">
            <div className="border rounded-lg overflow-hidden bg-secondary/5 min-h-[250px]">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    Assigned Devices
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {policy.devices.map((device: any) => (
                    <div 
                      key={device.id}
                      className="bg-secondary text-secondary-foreground rounded-md px-3 py-2.5 text-sm flex items-center gap-1.5"
                    >
                      <Smartphone className="h-4 w-4" />
                      <span>{device.name}</span>
                    </div>
                  ))}
                </div>
                
                {policy.devices.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground">
                    <Smartphone className="h-12 w-12 mb-2 opacity-20" />
                    <p>No devices assigned to this policy</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="profiles" className="pt-4">
            <div className="border rounded-lg overflow-hidden bg-secondary/5 min-h-[250px]">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    Configuration Profiles
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {policy.profiles.map((profile: any) => (
                    <div 
                      key={profile.id}
                      className="bg-primary/10 text-primary rounded-md px-3 py-2.5 text-sm flex items-center gap-1.5"
                    >
                      <Shield className="h-4 w-4" />
                      <span>{profile.name}</span>
                    </div>
                  ))}
                </div>
                
                {policy.profiles.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground">
                    <Shield className="h-12 w-12 mb-2 opacity-20" />
                    <p>No profiles assigned to this policy</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex gap-2 mt-4">
        <Button variant="outline" className="flex-1">
          <Shield className="h-4 w-4 mr-2" />
          Edit Policy Settings
        </Button>
        <Button variant={policy.isDefault ? "ghost" : "destructive"} size="icon" disabled={policy.isDefault}>
          <Info className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

// Test Card Layout page to demonstrate different options
const TestCardLayout = () => {
  return (
    <AuthCheck>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 container mx-auto p-4 md:p-6">
          <div className="flex flex-col md:items-center justify-between mb-6 gap-2">
            <h1 className="text-2xl font-bold">Card Layout Options</h1>
            <p className="text-muted-foreground">
              Different approaches to displaying policy cards with varying content
            </p>
          </div>
          
          <Tabs defaultValue="option1" className="w-full">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="option1">Original Cards</TabsTrigger>
              <TabsTrigger value="option2">Collapsible Sections</TabsTrigger>
              <TabsTrigger value="option3">Accordion Layout</TabsTrigger>
              <TabsTrigger value="option4">Tabs Layout</TabsTrigger>
            </TabsList>
            
            <TabsContent value="option1">
              <h2 className="text-xl font-semibold mb-4">Original Layout</h2>
              <p className="text-muted-foreground mb-6">The current implementation with cards expanding to match each other in height</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockPolicies.map(policy => (
                  <OriginalPolicyCard key={policy.id} policy={policy} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="option2">
              <h2 className="text-xl font-semibold mb-4">Collapsible Sections</h2>
              <p className="text-muted-foreground mb-6">Sections can be collapsed/expanded independently</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockPolicies.map(policy => (
                  <CollapsiblePolicyCard key={policy.id} policy={policy} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="option3">
              <h2 className="text-xl font-semibold mb-4">Accordion Layout</h2>
              <p className="text-muted-foreground mb-6">Uses the accordion component for expandable sections</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockPolicies.map(policy => (
                  <AccordionPolicyCard key={policy.id} policy={policy} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="option4">
              <h2 className="text-xl font-semibold mb-4">Tabs Layout</h2>
              <p className="text-muted-foreground mb-6">Uses tabs to organize different types of information</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockPolicies.map(policy => (
                  <TabsPolicyCard key={policy.id} policy={policy} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthCheck>
  );
};

export default TestCardLayout;