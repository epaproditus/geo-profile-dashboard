/**
 * Geocoding service for converting addresses to coordinates
 * We're using OpenStreetMap Nominatim API for geocoding
 */

interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  boundingBox?: [string, string, string, string];
}

/**
 * Geocode an address to coordinates using OpenStreetMap Nominatim API
 * 
 * @param address The address to geocode
 * @returns Promise resolving to geocoding results
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult[]> {
  try {
    // Nominatim API URL with proper encoding
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5`;
    
    const response = await fetch(url, {
      headers: {
        // Adding user-agent header as per Nominatim usage policy
        'User-Agent': 'GeoProfileDashboard/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Map the response to our GeocodingResult interface
    return data.map((result: any) => ({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      boundingBox: result.boundingbox
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

/**
 * Reverse geocode coordinates to an address
 * 
 * @param lat Latitude
 * @param lng Longitude
 * @returns Promise resolving to address details
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{ displayName: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GeoProfileDashboard/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      displayName: data.display_name
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw error;
  }
}