import React, { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useDevices } from "@/hooks/use-simplemdm";

const DeviceFilterSelector = ({ value, onChange }) => {
  const [nameFilter, setNameFilter] = useState("");
  const { data: devicesData, isLoading } = useDevices();
  
  // Parse existing filter or create a new one
  const filter = value ? JSON.parse(value) : { nameContains: "", groupIds: [] };
  
  const handleNameFilterChange = (newValue) => {
    setNameFilter(newValue);
    const newFilter = { ...filter, nameContains: newValue };
    onChange(JSON.stringify(newFilter));
  };
  
  // Preview of matching devices
  const matchingDevices = devicesData?.data?.filter(device => {
    if (!filter.nameContains) return true;
    return device.attributes.name.toLowerCase().includes(filter.nameContains.toLowerCase());
  }) || [];
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input 
          placeholder="Filter devices by name"
          value={filter.nameContains || ""}
          onChange={(e) => handleNameFilterChange(e.target.value)}
        />
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" type="button" size="icon">
              <Info className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-medium">Device Filter</h4>
              <p className="text-sm text-muted-foreground">
                Filter which devices this schedule will apply to. Leave empty to apply to all devices.
              </p>
              {matchingDevices.length > 0 ? (
                <div className="mt-2">
                  <p className="text-sm font-medium">Matching Devices ({matchingDevices.length}):</p>
                  <div className="max-h-40 overflow-y-auto mt-1">
                    {matchingDevices.slice(0, 10).map(device => (
                      <Badge key={device.id} variant="outline" className="mr-1 mb-1">
                        {device.attributes.name}
                      </Badge>
                    ))}
                    {matchingDevices.length > 10 && (
                      <Badge variant="outline" className="mr-1 mb-1">
                        +{matchingDevices.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No matching devices found.</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {filter.nameContains && (
        <Card className="border border-dashed">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">
              {matchingDevices.length} device(s) will receive this profile when the schedule runs
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeviceFilterSelector;