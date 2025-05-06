import { useState, useEffect } from "react";
import AuthCheck from "@/components/AuthCheck";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Shield, Smartphone, Check, Info, RefreshCw, AlertTriangle, Globe, Network } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { simplemdmApi } from "@/lib/api/simplemdm";
import locationProfileService from "@/lib/services/location-profile-service";

// Helper function to check if IP address is within range
function isIpInRange(deviceIp: string, rangeIp: string): boolean {
  try {
    // Check for exact match first (most common case)
    if (deviceIp === rangeIp) {
      console.log(`IP exact match found: ${deviceIp} matches ${rangeIp}`);
      return true;
    }
    
    // Handle CIDR notation (e.g., "192.168.1.0/24")
    if (rangeIp.includes('/')) {
      // Simple string-based check for partial matches
      const baseIp = rangeIp.split('/')[0];
      const mask = parseInt(rangeIp.split('/')[1], 10);
      
      // For IP addresses like 64.209.154.154, check if they match the base
      if (mask >= 24 && deviceIp.startsWith(baseIp.substring(0, baseIp.lastIndexOf('.')))) {
        console.log(`IP subnet match found: ${deviceIp} is within ${rangeIp}`);
        return true;
      }
    }
    
    // For other formats like wildcard (e.g., "64.209.154.*")
    if (rangeIp.includes('*')) {
      const targetParts = rangeIp.split('.');
      const deviceParts = deviceIp.split('.');
      
      if (targetParts.length !== 4 || deviceParts.length !== 4) {
        return false;
      }
      
      for (let i = 0; i < 4; i++) {
        if (targetParts[i] !== '*' && targetParts[i] !== deviceParts[i]) {
          return false;
        }
      }
      
      console.log(`IP wildcard match found: ${deviceIp} matches ${rangeIp}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking IP match: ${error}`);
    return false;
  }
}

export default function ProfileDebugger() {
  const [devices, setDevices] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [enableLogging, setEnableLogging] = useState(true);
  const [logs, setLogs] = useState([]);
  const [customIpAddress, setCustomIpAddress] = useState('');
  const [testResults, setTestResults] = useState(null);

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Replace mock data with your actual IP address for testing
        const mockDevices = [
          { id: "123", name: "iPhone 13", attributes: { location_latitude: "26.30169", location_longitude: "-98.18092", ip_address: "64.209.154.154" } },
          { id: "456", name: "iPad Pro", attributes: { location_latitude: "37.7749", location_longitude: "-122.4194", ip_address: "192.168.1.20" } }
        ];
        
        // Include your specific policy with the IP range you're testing
        const mockPolicies = [
          {
            id: "default",
            name: "Default Policy",
            isDefault: true,
            devices: [],
            locations: [],
            profiles: [{ id: "wifi-basic", name: "Basic WiFi" }]
          },
          {
            id: "main-office",
            name: "Main Office",
            isDefault: false,
            devices: [{ id: "123" }],
            locations: [
              { latitude: 26.30169, longitude: -98.18092, radius: 500, displayName: "Office" }
            ],
            profiles: [{ id: "dns-over-https", name: "DNS-over-HTTPS [test]" }],
            ipRanges: [{ displayName: "Main Office", ipAddress: "64.209.154.154", geofenceId: "ip-123" }]
          }
        ];
        
        const mockProfiles = [
          { id: "wifi-basic", name: "Basic WiFi" },
          { id: "dns-over-https", name: "DNS-over-HTTPS [test]" },
          { id: "vpn", name: "Corporate VPN" }
        ];
        
        setDevices(mockDevices);
        setPolicies(mockPolicies);
        setProfiles(mockProfiles);
        setSelectedDevice(mockDevices[0]);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Override console.log to capture logs
    if (enableLogging) {
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      console.log = (...args) => {
        setLogs((prev) => [...prev, { type: "log", message: args.join(" "), timestamp: new Date() }]);
        originalConsoleLog(...args);
      };
      
      console.error = (...args) => {
        setLogs((prev) => [...prev, { type: "error", message: args.join(" "), timestamp: new Date() }]);
        originalConsoleError(...args);
      };
      
      return () => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      };
    }
  }, [enableLogging]);

  // Test profile application
  const testProfileApplication = () => {
    if (!selectedDevice) {
      toast({
        title: "Error",
        description: "Please select a device first",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setLogs([]);
    
    try {
      // Find which policies apply to this device based on location and IP address
      const deviceLat = parseFloat(selectedDevice.attributes.location_latitude);
      const deviceLng = parseFloat(selectedDevice.attributes.location_longitude);
      const deviceIp = selectedDevice.attributes.ip_address;
      
      const applicablePolicies = locationProfileService.findApplicablePolicies(
        selectedDevice.id,
        deviceLat,
        deviceLng,
        policies
      ).filter(policy => 
        !policy.ipRanges || policy.ipRanges.some(range => isIpInRange(deviceIp, range))
      );
      
      // Get profiles from applicable policies
      const applicableProfiles = applicablePolicies.flatMap(p => p.profiles);
      
      setResults({
        device: selectedDevice,
        deviceLocation: { lat: deviceLat, lng: deviceLng },
        deviceIp,
        applicablePolicies,
        applicableProfiles
      });
      
      toast({
        title: "Test Complete",
        description: `Found ${applicablePolicies.length} applicable policies with ${applicableProfiles.length} profiles for this device.`,
      });
    } catch (error) {
      console.error("Error testing profile application:", error);
      toast({
        title: "Error",
        description: "Failed to test profile application. See logs for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Push a specific profile to device manually
  const pushProfileToDevice = async () => {
    if (!selectedDevice || !selectedProfile) {
      toast({
        title: "Error",
        description: "Please select both a device and a profile",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      // In a real implementation, this would call your API
      console.log(`Pushing profile ${selectedProfile} to device ${selectedDevice.id}`);
      
      // Mock successful push
      setTimeout(() => {
        toast({
          title: "Success",
          description: `Profile ${selectedProfile} pushed to ${selectedDevice.name}`,
          variant: "default"
        });
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error("Error pushing profile:", error);
      toast({
        title: "Error",
        description: "Failed to push profile to device. See logs for details.",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  // Test IP address match against policies
  const testIpMatch = () => {
    if (!customIpAddress) {
      toast({
        title: "Missing Information",
        description: "Please enter an IP address to test",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setLogs([]);
    
    try {
      console.log(`Testing IP address: ${customIpAddress}`);
      
      const matchingPolicies = policies.filter(policy => 
        !policy.isDefault && policy.ipRanges && policy.ipRanges.some(range => {
          const matches = isIpInRange(customIpAddress, range.ipAddress);
          console.log(`Testing ${customIpAddress} against ${range.ipAddress}: ${matches ? 'MATCH' : 'NO MATCH'}`);
          return matches;
        })
      );
      
      // Find default policy as fallback
      const defaultPolicy = policies.find(p => p.isDefault);
      
      setTestResults({
        ipAddress: customIpAddress,
        matchingPolicies,
        defaultPolicy,
        activePolicy: matchingPolicies.length > 0 ? matchingPolicies[0] : defaultPolicy,
        applicableProfiles: matchingPolicies.length > 0 
          ? matchingPolicies.flatMap(p => p.profiles)
          : defaultPolicy?.profiles || []
      });
      
      toast({
        title: "IP Test Complete",
        description: matchingPolicies.length > 0 
          ? `Matched ${matchingPolicies.length} policies` 
          : "No matching policies, would use default policy",
      });
    } catch (error) {
      console.error("Error testing IP address:", error);
      toast({
        title: "Error",
        description: "Failed to test IP address. See logs for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container py-6">
        <AuthCheck>
          <h1 className="text-2xl font-bold mb-4">Profile Application Debugger</h1>
          <p className="text-muted-foreground mb-6">
            Use this tool to debug and test profile application for devices based on their location, IP address, and policy settings.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Profile Application Test</CardTitle>
                <CardDescription>
                  Test which profiles will be applied to a device based on its current location and IP address
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="device">Select Device</Label>
                    <Select 
                      value={selectedDevice?.id || ""}
                      onValueChange={(value) => setSelectedDevice(devices.find(d => d.id === value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a device" />
                      </SelectTrigger>
                      <SelectContent>
                        {devices.map(device => (
                          <SelectItem key={device.id} value={device.id}>
                            {device.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedDevice && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="latitude">Latitude</Label>
                        <Input 
                          id="latitude" 
                          value={selectedDevice.attributes.location_latitude || ""} 
                          readOnly
                        />
                      </div>
                      <div>
                        <Label htmlFor="longitude">Longitude</Label>
                        <Input 
                          id="longitude" 
                          value={selectedDevice.attributes.location_longitude || ""} 
                          readOnly
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="ip-address">IP Address</Label>
                        <Input 
                          id="ip-address" 
                          value={selectedDevice.attributes.ip_address || ""} 
                          readOnly
                        />
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    onClick={testProfileApplication} 
                    disabled={loading || !selectedDevice}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test Profile Application"
                    )}
                  </Button>
                </div>
                
                {results && (
                  <div className="mt-6 border rounded-md p-4">
                    <h3 className="font-semibold text-lg mb-2">Results</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">Applicable Policies</h4>
                        {results.applicablePolicies.length > 0 ? (
                          <ul className="list-disc ml-5 mt-2">
                            {results.applicablePolicies.map(policy => (
                              <li key={policy.id} className="text-sm">
                                {policy.name}
                                {policy.isDefault && <span className="text-muted-foreground ml-2">(Default)</span>}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground text-sm mt-2">No applicable policies found</p>
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-medium">Profiles to Apply</h4>
                        {results.applicableProfiles.length > 0 ? (
                          <ul className="list-disc ml-5 mt-2">
                            {results.applicableProfiles.map(profile => (
                              <li key={profile.id} className="text-sm">
                                {profile.name} <span className="text-muted-foreground">({profile.id})</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground text-sm mt-2">No profiles to apply</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>IP Address Policy Test</CardTitle>
                <CardDescription>
                  Test a specific IP address against all defined policies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="custom-ip">IP Address to Test</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="custom-ip" 
                        value={customIpAddress}
                        onChange={(e) => setCustomIpAddress(e.target.value)}
                        placeholder="e.g., 64.209.154.154"
                      />
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          // Get current IP address from API
                          fetch('https://api.ipify.org?format=json')
                            .then(response => response.json())
                            .then(data => {
                              setCustomIpAddress(data.ip);
                              toast({
                                title: "IP Address Detected",
                                description: `Your current IP address is: ${data.ip}`
                              });
                            })
                            .catch(() => {
                              toast({
                                title: "Error",
                                description: "Failed to detect your IP address",
                                variant: "destructive"
                              });
                            });
                        }}
                      >
                        <Network className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={testIpMatch}
                    disabled={loading || !customIpAddress}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test IP Address"
                    )}
                  </Button>
                  
                  {testResults && (
                    <div className="mt-4 border rounded-md p-4">
                      <h3 className="font-semibold text-lg mb-2">IP Test Results</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium">Matched Policies</h4>
                          {testResults.matchingPolicies.length > 0 ? (
                            <ul className="list-disc ml-5 mt-2">
                              {testResults.matchingPolicies.map(policy => (
                                <li key={policy.id} className="text-sm">
                                  {policy.name}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground text-sm mt-2">
                              No matches - would use default policy
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="font-medium">Active Policy</h4>
                          <p className="mt-1 text-sm font-medium">
                            {testResults.activePolicy?.name}
                            {testResults.activePolicy?.isDefault && 
                              <Badge variant="outline" className="ml-2">Default</Badge>
                            }
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium">Profiles that would apply</h4>
                          {testResults.applicableProfiles.length > 0 ? (
                            <ul className="list-disc ml-5 mt-2">
                              {testResults.applicableProfiles.map(profile => (
                                <li key={profile.id} className="text-sm">
                                  {profile.name}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground text-sm mt-2">No profiles would apply</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Debug Logs</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="enable-logging" 
                    checked={enableLogging}
                    onCheckedChange={setEnableLogging}
                  />
                  <Label htmlFor="enable-logging">Enable Logging</Label>
                  
                  <Button variant="outline" size="sm" onClick={() => setLogs([])} className="ml-2">
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-y-auto p-2 bg-muted rounded-md font-mono text-xs">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`py-1 border-b border-muted-foreground/20 ${
                        log.type === "error" ? "text-red-500" : ""
                      }`}
                    >
                      <span className="text-muted-foreground">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <span className="ml-2">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No logs to display. Test profile application to see debug output.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </AuthCheck>
      </div>
    </>
  );
}