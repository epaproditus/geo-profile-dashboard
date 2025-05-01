import React, { useState, useEffect } from 'react';
import { useDevices } from '@/hooks/use-simplemdm';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Smartphone, Loader2 } from 'lucide-react';

interface DeviceSelectorProps {
  selectedDevices: {
    id: string;
    name: string;
  }[];
  onSelectionChange: (devices: { id: string; name: string }[]) => void;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({ selectedDevices, onSelectionChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: devicesData, isLoading, isError } = useDevices({ limit: 50 });
  const [filteredDevices, setFilteredDevices] = useState<any[]>([]);

  useEffect(() => {
    if (devicesData?.data) {
      let devices = devicesData.data.filter(device => 
        device.attributes.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (device.attributes.device_name && device.attributes.device_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredDevices(devices);
    }
  }, [devicesData, searchQuery]);

  const handleDeviceToggle = (device: any) => {
    const isSelected = selectedDevices.some(d => d.id === String(device.id));
    let updatedSelection;
    
    if (isSelected) {
      // Remove from selection
      updatedSelection = selectedDevices.filter(d => d.id !== String(device.id));
    } else {
      // Add to selection
      updatedSelection = [
        ...selectedDevices,
        { 
          id: String(device.id), 
          name: device.attributes.name || device.attributes.device_name || `Device ${device.id}`
        }
      ];
    }
    
    onSelectionChange(updatedSelection);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search devices..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Loading devices...</span>
        </div>
      ) : isError ? (
        <div className="text-red-500 p-4 text-center">
          Error loading devices. Please check your API connection.
        </div>
      ) : (
        <Card className="border">
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              {filteredDevices.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No devices found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredDevices.map((device) => (
                    <div 
                      key={device.id} 
                      className="flex items-center space-x-2 p-3 hover:bg-muted/30"
                    >
                      <Checkbox
                        id={`device-${device.id}`}
                        checked={selectedDevices.some(d => d.id === String(device.id))}
                        onCheckedChange={() => handleDeviceToggle(device)}
                      />
                      <label
                        htmlFor={`device-${device.id}`}
                        className="flex-1 flex items-start cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{device.attributes.name || device.attributes.device_name || `Device ${device.id}`}</p>
                            <p className="text-xs text-muted-foreground">
                              {device.attributes.model_name || 'Unknown model'} • 
                              {device.attributes.status === 'enrolled' ? ' Enrolled' : ' ' + (device.attributes.status || 'Unknown status')}
                            </p>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      
      {selectedDevices.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">Selected devices: {selectedDevices.length}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onSelectionChange([])}
            >
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedDevices.map(device => (
              <div 
                key={device.id}
                className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs flex items-center gap-1"
              >
                <span>{device.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-secondary/80"
                  onClick={() => onSelectionChange(selectedDevices.filter(d => d.id !== device.id))}
                >
                  <span className="sr-only">Remove</span>
                  <span>×</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceSelector;