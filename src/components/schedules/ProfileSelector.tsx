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
import { Check, Loader2 } from "lucide-react";

// This is a simplified version of ProfileSelector for schedule forms
// It works with a single profile ID instead of an array of profiles
interface SingleProfileSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ProfileSelector({ 
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