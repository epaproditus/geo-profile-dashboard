import React, { useState } from "react";
import { useAllProfiles } from "@/hooks/use-simplemdm";
import { SimpleMDMProfile } from "@/lib/api/simplemdm";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Loader2, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Single profile selector props
interface SingleProfileSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

// Multi profile selector props
interface MultiProfileSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

// Component for a single profile selection
export function SingleProfileSelector({ 
  value, 
  onChange 
}: SingleProfileSelectorProps) {
  const [search, setSearch] = useState("");
  const { data: profilesData, isLoading, error } = useAllProfiles();

  // Get the name of the currently selected profile
  const selectedProfileName = profilesData?.data?.find(
    p => p.id.toString() === value
  )?.attributes.name || "";

  return (
    <Command className="rounded-lg border shadow-md">
      <CommandInput 
        placeholder="Search profiles..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No profiles found.</CommandEmpty>
        <CommandGroup heading="Configuration Profiles">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-red-500">
              Error loading profiles. Please try again.
            </div>
          ) : (
            <ScrollArea className="h-[240px]">
              {profilesData?.data
                ?.filter(profile => 
                  profile.attributes.name.toLowerCase().includes(search.toLowerCase())
                )
                .map(profile => {
                  const isSelected = value === profile.id.toString();
                  return (
                    <CommandItem
                      key={profile.id}
                      onSelect={() => onChange(profile.id.toString())}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <span>{profile.attributes.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {profile.attributes.description || "No description"}
                        </p>
                      </div>
                      {isSelected ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : null}
                    </CommandItem>
                  );
                })}
            </ScrollArea>
          )}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

// Component for multiple profile selection
export function MultiProfileSelector({
  value,
  onChange
}: MultiProfileSelectorProps) {
  const [search, setSearch] = useState("");
  const { data: profilesData, isLoading, error } = useAllProfiles();

  // Get profile names for selected profiles
  const selectedProfileNames = profilesData?.data
    ?.filter(p => value.includes(p.id.toString()))
    .map(p => p.attributes.name) || [];

  const toggleProfile = (profileId: string) => {
    if (value.includes(profileId)) {
      onChange(value.filter(id => id !== profileId));
    } else {
      onChange([...value, profileId]);
    }
  };
  
  // Toggle dropdown visibility
  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dropdown = document.getElementById("profile-selector-dropdown");
    if (dropdown) {
      // Close all other dropdowns first
      ["hour-selector", "minute-selector", "period-selector", "date-picker-calendar", "device-filter-dropdown"].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = "none";
      });
      
      // Toggle this dropdown
      dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
      
      // Add click outside handler to close dropdown
      if (dropdown.style.display === "block") {
        setTimeout(() => {
          const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest("#profile-selector-dropdown") && 
                !target.closest("[data-dropdown-trigger='profile-selector']")) {
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
    <div className="relative w-full">
      <Button
        variant="outline"
        type="button"
        data-dropdown-trigger="profile-selector"
        onClick={toggleDropdown}
        className="w-full justify-between"
      >
        <div className="flex flex-wrap gap-1 max-w-[90%] overflow-hidden text-left">
          {value.length > 0 ? (
            value.length <= 2 ? (
              selectedProfileNames.map((name, i) => (
                <Badge key={i} variant="secondary" className="mr-1">
                  {name}
                </Badge>
              ))
            ) : (
              <>
                <Badge variant="secondary">{selectedProfileNames[0]}</Badge>
                <Badge variant="secondary" className="bg-muted">
                  +{value.length - 1} more
                </Badge>
              </>
            )
          ) : (
            <span className="text-muted-foreground">Select profiles...</span>
          )}
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      <div
        id="profile-selector-dropdown"
        className="absolute left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md"
        style={{ display: "none" }}
      >
        <Command className="rounded-none border-0 shadow-none">
          <CommandInput 
            placeholder="Search profiles..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[240px]">
            <CommandEmpty>No profiles found.</CommandEmpty>
            <CommandGroup heading="Configuration Profiles">
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="p-4 text-sm text-red-500">
                  Error loading profiles. Please try again.
                </div>
              ) : (
                <ScrollArea className="h-[240px]">
                  {profilesData?.data
                    ?.filter(profile => 
                      profile.attributes.name.toLowerCase().includes(search.toLowerCase())
                    )
                    .map(profile => {
                      const isSelected = value.includes(profile.id.toString());
                      return (
                        <CommandItem
                          key={profile.id}
                          onSelect={() => {
                            toggleProfile(profile.id.toString());
                            // Don't close dropdown when selecting profiles
                          }}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <span>{profile.attributes.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {profile.attributes.description || "No description"}
                            </p>
                          </div>
                          {isSelected ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : null}
                        </CommandItem>
                      );
                    })}
                </ScrollArea>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  );
}

// Default export for backward compatibility
export default SingleProfileSelector;