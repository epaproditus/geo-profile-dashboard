import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { geocodeAddress, reverseGeocode } from '@/lib/services/geocoding';
import { Loader2, MapPin, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GeofenceAddressSearchProps {
  onSelectLocation: (lat: number, lng: number, displayName: string) => void;
  isLoading?: boolean;
}

interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

const GeofenceAddressSearch: React.FC<GeofenceAddressSearchProps> = ({ 
  onSelectLocation,
  isLoading = false
}) => {
  const [address, setAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const results = await geocodeAddress(address);
      setSearchResults(results);
      
      if (results.length === 0) {
        setSearchError('No locations found for this address. Please try a different search term.');
      }
    } catch (error) {
      console.error('Address search error:', error);
      setSearchError('Failed to search for address. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: GeocodeResult) => {
    onSelectLocation(result.lat, result.lng, result.displayName);
    setSearchResults([]);
  };

  return (
    <div className="space-y-4">
      <Label htmlFor="address-search">Search for an address</Label>
      <form onSubmit={handleAddressSearch} className="flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="address-search"
            type="text"
            placeholder="Enter an address..."
            className="pl-8"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isSearching || isLoading}
          />
        </div>
        <Button 
          type="submit" 
          disabled={!address.trim() || isSearching || isLoading}
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            'Search'
          )}
        </Button>
      </form>
      
      {searchError && (
        <p className="text-sm text-red-500">{searchError}</p>
      )}
      
      {searchResults.length > 0 && (
        <Card className="border p-0">
          <ScrollArea className="max-h-60">
            <div className="p-1">
              {searchResults.map((result, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start text-left py-2 h-auto my-1"
                  onClick={() => handleSelectResult(result)}
                >
                  <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{result.displayName}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};

export default GeofenceAddressSearch;