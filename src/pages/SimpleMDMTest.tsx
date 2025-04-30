import { useState } from "react";
import { useDevices, useDevice, useUpdateDeviceLocation } from "@/hooks/use-simplemdm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw } from "lucide-react";
import { SimpleMDMDevice } from "@/lib/api/simplemdm";

const SimpleMDMTest = () => {
  const [deviceId, setDeviceId] = useState("");
  const [showRawData, setShowRawData] = useState(false);
  
  // Fetch all devices
  const { 
    data: devicesData, 
    isLoading: isLoadingDevices, 
    isError: isErrorDevices, 
    error: devicesError, 
    refetch: refetchDevices 
  } = useDevices({ limit: 10 });
  
  // Fetch specific device
  const { 
    data: deviceData, 
    isLoading: isLoadingDevice, 
    isError: isErrorDevice, 
    error: deviceError,
    refetch: refetchDevice
  } = useDevice(deviceId || "0");
  
  // Update device location
  const updateDeviceLocation = useUpdateDeviceLocation();

  // Select a device
  const handleSelectDevice = (device: SimpleMDMDevice) => {
    setDeviceId(String(device.id));
  };

  // Request location update
  const handleUpdateLocation = (id: string | number) => {
    updateDeviceLocation.mutate(id);
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">SimpleMDM API Test</h1>
      
      {/* Test Controls */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button onClick={() => refetchDevices()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refetch All Devices
        </Button>
        <Button onClick={() => setShowRawData(!showRawData)} variant="outline">
          {showRawData ? "Show Formatted Data" : "Show Raw JSON"}
        </Button>
      </div>
      
      {/* Device List Section */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Device List</CardTitle>
            <CardDescription>
              {isLoadingDevices
                ? "Loading devices..."
                : isErrorDevices
                ? `Error: ${(devicesError as Error)?.message || "Unknown error"}`
                : `${devicesData?.data?.length || 0} devices found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDevices ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading devices...</span>
              </div>
            ) : isErrorDevices ? (
              <div className="p-4 bg-red-50 text-red-800 rounded-md">
                <p>Error loading devices:</p>
                <pre className="mt-2 text-sm">{JSON.stringify(devicesError, null, 2)}</pre>
              </div>
            ) : (
              <div className="space-y-4">
                {showRawData ? (
                  <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md overflow-auto max-h-[400px]">
                    {JSON.stringify(devicesData, null, 2)}
                  </pre>
                ) : (
                  <div className="grid gap-2">
                    {devicesData?.data?.map((device) => (
                      <div
                        key={device.id}
                        className="p-3 border rounded-md hover:bg-accent cursor-pointer flex justify-between items-center"
                        onClick={() => handleSelectDevice(device)}
                      >
                        <div>
                          <p className="font-medium">{device.attributes.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {device.attributes.model_name || "Unknown model"} • 
                            Status: {device.attributes.status}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateLocation(device.id);
                          }}
                        >
                          Update Location
                        </Button>
                      </div>
                    ))}
                    
                    {devicesData?.data?.length === 0 && (
                      <p className="text-center p-4 text-muted-foreground">
                        No devices found in your SimpleMDM account.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Single Device Details */}
      {deviceId && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Device Details</CardTitle>
              <CardDescription>
                ID: {deviceId}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-2"
                  onClick={() => refetchDevice()}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDevice ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading device details...</span>
                </div>
              ) : isErrorDevice ? (
                <div className="p-4 bg-red-50 text-red-800 rounded-md">
                  <p>Error loading device details:</p>
                  <pre className="mt-2 text-sm">{JSON.stringify(deviceError, null, 2)}</pre>
                </div>
              ) : (
                <div className="space-y-4">
                  {showRawData ? (
                    <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md overflow-auto max-h-[400px]">
                      {JSON.stringify(deviceData, null, 2)}
                    </pre>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <h3 className="font-semibold">Basic Information</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div>Name</div>
                          <div>{deviceData?.data.attributes.name}</div>
                          
                          <div>Model</div>
                          <div>{deviceData?.data.attributes.model_name}</div>
                          
                          <div>Serial</div>
                          <div>{deviceData?.data.attributes.serial_number || "N/A"}</div>
                          
                          <div>Status</div>
                          <div>{deviceData?.data.attributes.status}</div>
                          
                          <div>Last Seen</div>
                          <div>{deviceData?.data.attributes.last_seen_at || "Never"}</div>
                        </div>
                      </div>
                      
                      <div className="grid gap-2">
                        <h3 className="font-semibold">Location Information</h3>
                        {deviceData?.data.attributes.location_latitude && deviceData?.data.attributes.location_longitude ? (
                          <div className="grid grid-cols-2 gap-2">
                            <div>Latitude</div>
                            <div>{deviceData.data.attributes.location_latitude}</div>
                            
                            <div>Longitude</div>
                            <div>{deviceData.data.attributes.location_longitude}</div>
                            
                            <div>Accuracy</div>
                            <div>{deviceData.data.attributes.location_accuracy || "N/A"}</div>
                            
                            <div>Last Updated</div>
                            <div>{deviceData.data.attributes.location_updated_at || "N/A"}</div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No location data available</p>
                        )}
                        
                        <Button 
                          onClick={() => handleUpdateLocation(deviceId)}
                          disabled={updateDeviceLocation.isPending && updateDeviceLocation.variables === deviceId}
                        >
                          {updateDeviceLocation.isPending && updateDeviceLocation.variables === deviceId ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Request Location Update
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SimpleMDMTest;