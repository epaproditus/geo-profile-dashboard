import React, { useState, useEffect } from "react";
import { Info, Search, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useDevices } from "@/hooks/use-simplemdm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const DeviceFilterSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: devicesData, isLoading } = useDevices();
  
  // Parse existing filter or create a new one
  const filter = value ? JSON.parse(value) : { nameContains: "", groupIds: [] };
  
  const handleNameFilterChange = (newValue) => {
    const newFilter = { ...filter, nameContains: newValue };
    onChange(JSON.stringify(newFilter));
  };
  
  // Preview of matching devices
  const matchingDevices = devicesData?.data?.filter(device => {
    if (!filter.nameContains) return true;
    return device.attributes.name.toLowerCase().includes(filter.nameContains.toLowerCase());
  }) || [];
  
  // List of devices for the dropdown
  const filteredDevices = devicesData?.data?.filter(device => {
    return device.attributes.name.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];
  
  // Toggle dropdown visibility
  const toggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dropdown = document.getElementById("device-filter-dropdown");
    if (dropdown) {
      // Close all other dropdowns first
      ["hour-selector", "minute-selector", "period-selector", "date-picker-calendar", "profile-selector-dropdown"].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = "none";
      });
      
      // Toggle this dropdown
      dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
      
      if (dropdown.style.display === "block") {
        // Focus search input when dropdown opens
        const searchInput = document.getElementById("device-search-input");
        if (searchInput) {
          setTimeout(() => {
            searchInput.focus();
          }, 100);
        }
        
        // Add click outside handler
        setTimeout(() => {
          const handleClickOutside = (event) => {
            const target = event.target;
            if (!target.closest("#device-filter-dropdown") && 
                !target.closest("[data-dropdown-trigger='device-filter']")) {
              dropdown.style.display = "none";
              document.removeEventListener("click", handleClickOutside);
            }
          };
          document.addEventListener("click", handleClickOutside);
        }, 10);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative w-full">
        <Button
          variant="outline"
          type="button"
          data-dropdown-trigger="device-filter"
          onClick={toggleDropdown}
          className="w-full justify-between text-left font-normal"
        >
          {filter.nameContains ? (
            <span>Filter: "{filter.nameContains}" ({matchingDevices.length} devices)</span>
          ) : (
            <span className="text-muted-foreground">Filter devices by name...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        
        <div
          id="device-filter-dropdown"
          className="absolute left-0 right-0 z-50 mt-1 rounded-md border bg-popover p-2 shadow-md"
          style={{ display: "none" }}
        >
          <div className="flex items-center border rounded-md mb-2 px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              id="device-search-input"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pl-1"
            />
          </div>
          
          <ScrollArea className="h-[200px]">
            {isLoading ? (
              <div className="p-2 text-sm text-muted-foreground">Loading devices...</div>
            ) : filteredDevices.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No devices found</div>
            ) : (
              <div className="space-y-1">
                {filteredDevices.map(device => (
                  <Button
                    key={device.id}
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      handleNameFilterChange(device.attributes.name);
                      // Don't close dropdown after selection
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{device.attributes.name}</span>
                      {filter.nameContains === device.attributes.name && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <div className="pt-2 mt-2 border-t flex justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                handleNameFilterChange("");
                const dropdown = document.getElementById("device-filter-dropdown");
                if (dropdown) dropdown.style.display = "none";
              }}
            >
              Clear filter
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                const dropdown = document.getElementById("device-filter-dropdown");
                if (dropdown) dropdown.style.display = "none";
              }}
            >
              Close
            </Button>
          </div>
        </div>
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