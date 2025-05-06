import React, { useState, useEffect } from "react";
import { useAllProfiles } from "@/hooks/use-simplemdm";
import { SimpleMDMProfile } from "@/lib/api/simplemdm";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProfileSelectorProps {
  selectedProfiles: { id: string; name: string }[];
  onProfilesChange: (profiles: { id: string; name: string }[]) => void;
}

export default function ProfileSelector({ 
  selectedProfiles, 
  onProfilesChange 
}: ProfileSelectorProps) {
  const [search, setSearch] = useState("");
  // Using the new hook that fetches ALL profiles with pagination handling
  const { data: profilesData, isLoading, error } = useAllProfiles();

  // Function to handle selecting a profile
  const handleSelectProfile = (profile: SimpleMDMProfile) => {
    const isAlreadySelected = selectedProfiles.some(
      selected => selected.id === profile.id.toString()
    );

    if (isAlreadySelected) {
      // Remove profile if already selected
      onProfilesChange(
        selectedProfiles.filter(selected => selected.id !== profile.id.toString())
      );
    } else {
      // Add profile to selection
      onProfilesChange([
        ...selectedProfiles,
        { id: profile.id.toString(), name: profile.attributes.name }
      ]);
    }
  };

  // Function to remove a profile from selection
  const handleRemoveProfile = (profileId: string) => {
    onProfilesChange(
      selectedProfiles.filter(profile => profile.id !== profileId)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-lg">Available Profiles</CardTitle>
            <CardDescription>
              Select configuration profiles to apply when device enters this policy's location
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
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
                        .filter(profile => 
                          profile.attributes.name.toLowerCase().includes(search.toLowerCase())
                        )
                        .map(profile => {
                          const isSelected = selectedProfiles.some(
                            selected => selected.id === profile.id.toString()
                          );
                          return (
                            <CommandItem
                              key={profile.id}
                              onSelect={() => handleSelectProfile(profile)}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-lg">Selected Profiles</CardTitle>
            <CardDescription>
              These profiles will be pushed to devices that match this policy
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {selectedProfiles.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2">
                No profiles selected. Select profiles from the list above.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedProfiles.map(profile => (
                  <Badge key={profile.id} variant="secondary" className="flex items-center gap-1">
                    {profile.name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleRemoveProfile(profile.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}