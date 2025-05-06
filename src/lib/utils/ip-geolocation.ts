import axios from 'axios';

// Cache for IP geolocation results to reduce API calls
const ipGeolocationCache: Map<string, GeoLocation> = new Map();

// Define the interface for geolocation data
export interface GeoLocation {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  ip?: string;
  accuracy?: number;   // Accuracy radius in meters (if available)
  provider?: string;   // Service that provided the geolocation data
  isIpBased: boolean;  // Whether the location is based on IP or GPS
  networkType?: 'wifi' | 'cellular' | 'unknown'; // Type of network connection
}

// Default fallback location (used when geolocation fails)
const DEFAULT_LOCATION: GeoLocation = {
  latitude: 37.7749,
  longitude: -122.4194,
  city: 'Unknown',
  region: 'Unknown',
  country: 'Unknown',
  accuracy: 5000,
  isIpBased: true,
  networkType: 'unknown'
};

/**
 * Determine if an IP address is likely from a Wi-Fi or cellular connection
 * This is a heuristic approach, as it's not always possible to determine with 100% accuracy
 */
export function detectNetworkType(ipAddress: string): 'wifi' | 'cellular' | 'unknown' {
  if (!ipAddress) return 'unknown';
  
  // IPv6 addresses that match certain patterns are often from cellular networks
  const isCellularIpv6 = ipAddress.includes(':') && (
    // Mobile carrier IPv6 patterns (T-Mobile, Verizon, AT&T, etc.)
    ipAddress.includes('2600:') || 
    ipAddress.includes('2607:fb90:') ||
    ipAddress.includes('2001:4888:') ||
    // Additional carrier patterns can be added here
    false
  );
  
  if (isCellularIpv6) {
    return 'cellular';
  }
  
  // IPv4 addresses from typical cellular ranges
  // Note: These are approximations and may need adjustment
  const cellularIpv4Ranges = [
    // T-Mobile
    '208.54.0.0/16',
    // Verizon
    '174.192.0.0/14',
    '70.192.0.0/11',
    // AT&T
    '12.0.0.0/8',
    '107.0.0.0/8',
    // Sprint
    '68.28.0.0/16',
    // Add more carrier IP ranges as needed
  ];
  
  if (!ipAddress.includes(':') && isIpInAnyRange(ipAddress, cellularIpv4Ranges)) {
    return 'cellular';
  }
  
  // For IPv4 addresses in private ranges, they're likely Wi-Fi
  if (!ipAddress.includes(':') && (
    ipAddress.startsWith('10.') || 
    ipAddress.startsWith('192.168.') || 
    ipAddress.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
  )) {
    return 'wifi';
  }
  
  // For IPv6 addresses in local ranges
  if (ipAddress.includes(':') && (
    ipAddress.startsWith('fc') || 
    ipAddress.startsWith('fd') || 
    ipAddress.startsWith('fe80:')
  )) {
    return 'wifi';
  }
  
  // Default case - we can't determine with certainty
  return 'unknown';
}

/**
 * Get geolocation data for an IP address using ipinfo.io
 * This is the primary async implementation
 */
export async function getLocationFromIp(ipAddress: string): Promise<GeoLocation> {
  if (!ipAddress) return DEFAULT_LOCATION;

  // Check cache first
  if (ipGeolocationCache.has(ipAddress)) {
    return ipGeolocationCache.get(ipAddress);
  }

  try {
    // Detect network type
    const networkType = detectNetworkType(ipAddress);
    
    // Using ipinfo.io as the geolocation service - works for both IPv4 and IPv6
    // In a production environment, use an API key for better rate limits
    const response = await axios.get(`https://ipinfo.io/${ipAddress}/json`);
    
    // Extract data from the response
    const { loc, city, region, country } = response.data;
    
    if (!loc) {
      console.warn(`No location data found for IP: ${ipAddress}`);
      return {
        ...DEFAULT_LOCATION,
        ip: ipAddress,
        networkType
      };
    }
    
    // Parse the location string which is in "latitude,longitude" format
    const [latitude, longitude] = loc.split(',').map(parseFloat);
    
    const geoLocation: GeoLocation = {
      latitude,
      longitude,
      city,
      region,
      country,
      ip: ipAddress,
      accuracy: 5000, // Approximate accuracy for IP-based location (in meters)
      provider: 'ipinfo.io',
      isIpBased: true,
      networkType
    };

    // Cache the result
    ipGeolocationCache.set(ipAddress, geoLocation);
    return geoLocation;
  } catch (error) {
    console.error('Error fetching IP geolocation:', error);
    return {
      ...DEFAULT_LOCATION,
      ip: ipAddress,
      networkType: detectNetworkType(ipAddress)
    };
  }
}

/**
 * Fallback synchronous implementation using a simplified approach
 * This is used when we need a location immediately without waiting for API
 */
export function getLocationFromIpSync(ipAddress: string): GeoLocation {
  if (!ipAddress) return DEFAULT_LOCATION;

  // Return cached result if available
  if (ipGeolocationCache.has(ipAddress)) {
    return ipGeolocationCache.get(ipAddress);
  }

  // Check if this is an IPv6 address
  const isIpv6 = ipAddress.includes(':');
  
  try {
    // Very simple check for common private IP ranges
    if (!isIpv6 && (
      ipAddress.startsWith('10.') || 
      ipAddress.startsWith('192.168.') || 
      ipAddress.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    )) {
      // Return a default location for private IPv4 addresses
      return {
        latitude: 37.7749,
        longitude: -122.4194,
        city: 'Private Network',
        country: 'Local',
        accuracy: 10000,
        ip: ipAddress,
        isIpBased: true
      };
    }
    
    // Check for private IPv6 addresses
    if (isIpv6 && (
      ipAddress.startsWith('fc') || 
      ipAddress.startsWith('fd') || 
      ipAddress.startsWith('fe80:') ||
      ipAddress === '::1'
    )) {
      // Return a default location for private IPv6 addresses
      return {
        latitude: 37.7749,
        longitude: -122.4194,
        city: 'Private IPv6 Network',
        country: 'Local',
        accuracy: 10000,
        ip: ipAddress,
        isIpBased: true
      };
    }

    if (isIpv6) {
      // For public IPv6 addresses, we can't do much without an API call
      // Return a default with a note that this is fallback data
      console.warn('Cannot accurately geolocate IPv6 address synchronously, returning default. For accuracy, use the async getLocationFromIp()');
      return {
        ...DEFAULT_LOCATION,
        city: 'IPv6 Address',
        country: 'Unknown',
        ip: ipAddress,
        accuracy: 20000,
        isIpBased: true
      };
    }

    // Very basic rough geolocation based on the first octet for IPv4
    // This is just a fallback and not accurate
    const firstOctet = parseInt(ipAddress.split('.')[0], 10);
    
    // Extremely simplified mapping (just for demonstration)
    // In a real implementation, use a proper IP geolocation database
    if (firstOctet >= 1 && firstOctet <= 126) {
      // USA/Canada region (approximately)
      return {
        latitude: 37.7749,
        longitude: -122.4194,
        city: 'Unknown US/CA',
        country: 'US',
        accuracy: 10000,
        ip: ipAddress,
        isIpBased: true
      };
    } else if (firstOctet >= 128 && firstOctet <= 191) {
      // Europe region (approximately)
      return {
        latitude: 48.8566,
        longitude: 2.3522,
        city: 'Unknown EU',
        country: 'EU',
        accuracy: 10000,
        ip: ipAddress,
        isIpBased: true
      };
    } else if (firstOctet >= 192 && firstOctet <= 223) {
      // Asia/Pacific region (approximately)
      return {
        latitude: 35.6762,
        longitude: 139.6503,
        city: 'Unknown APAC',
        country: 'AP',
        accuracy: 10000,
        ip: ipAddress,
        isIpBased: true
      };
    }

    return {
      ...DEFAULT_LOCATION,
      ip: ipAddress
    };
  } catch (error) {
    console.error('Error in sync IP geolocation:', error);
    return {
      ...DEFAULT_LOCATION,
      ip: ipAddress
    };
  }
}

/**
 * Check if an IP address is within a CIDR range
 * Example: isIpInCidrRange('192.168.1.5', '192.168.1.0/24') => true
 */
export function isIpInCidrRange(ip: string, cidr: string): boolean {
  try {
    // Handle IPv6 addresses
    if (ip.includes(':')) {
      // For production use, consider a dedicated IPv6 library like ip6addr or ipaddr.js
      // This is a simplified implementation
      const [ipv6Prefix, prefixLength = '128'] = cidr.split('/');
      
      // Normalize IPv6 addresses to compare them properly
      const normalizedPrefix = normalizeIPv6(ipv6Prefix);
      const normalizedIp = normalizeIPv6(ip);
      
      // Convert prefix length to number of matching bits
      const matchBits = parseInt(prefixLength, 10);
      
      // Compare bit by bit for the specified prefix length
      for (let i = 0; i < matchBits; i++) {
        const bytePos = Math.floor(i / 8);
        const bitPos = 7 - (i % 8);
        
        const prefixByte = parseInt(normalizedPrefix.slice(bytePos * 2, bytePos * 2 + 2), 16);
        const ipByte = parseInt(normalizedIp.slice(bytePos * 2, bytePos * 2 + 2), 16);
        
        const prefixBit = (prefixByte >> bitPos) & 1;
        const ipBit = (ipByte >> bitPos) & 1;
        
        if (prefixBit !== ipBit) {
          return false;
        }
      }
      
      return true;
    }

    // Handle IPv4 addresses
    const [range, bits = '32'] = cidr.split('/');
    const maskBits = parseInt(bits, 10);
    
    // Convert IP addresses to numeric values
    const ip4ToInt = (ip: string) => {
      return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0) >>> 0;
    };
    
    const ipInt = ip4ToInt(ip);
    const rangeInt = ip4ToInt(range);
    const mask = -1 << (32 - maskBits);
    
    return (ipInt & mask) === (rangeInt & mask);
  } catch (error) {
    console.error('Error checking IP in CIDR range:', error);
    return false;
  }
}

/**
 * Helper function to normalize an IPv6 address for comparison
 * Converts to full form without abbreviations
 */
function normalizeIPv6(ip: string): string {
  // Handle empty or invalid addresses
  if (!ip) return '';
  
  // Replace IPv4-mapped notation if present
  if (ip.includes('.')) {
    const lastColon = ip.lastIndexOf(':');
    const ipv4Part = ip.substring(lastColon + 1);
    const ipv6Part = ip.substring(0, lastColon + 1);
    
    // Convert IPv4 to hex format
    const ipv4Hex = ipv4Part.split('.').map(octet => {
      const hex = parseInt(octet, 10).toString(16).padStart(2, '0');
      return hex;
    }).join('');
    
    ip = ipv6Part + ipv4Hex.substring(0, 4) + ':' + ipv4Hex.substring(4);
  }
  
  // Handle :: abbreviation
  if (ip.includes('::')) {
    const parts = ip.split('::');
    const leftParts = parts[0] ? parts[0].split(':') : [];
    const rightParts = parts[1] ? parts[1].split(':') : [];
    const missingCount = 8 - leftParts.length - rightParts.length;
    
    // Fill in missing zeros
    const middleParts = Array(missingCount).fill('0000');
    
    // Join all parts together
    const allParts = [
      ...leftParts.map(p => p.padStart(4, '0')),
      ...middleParts,
      ...rightParts.map(p => p.padStart(4, '0'))
    ];
    
    return allParts.join('');
  } else {
    // Handle standard notation
    return ip.split(':').map(p => p.padStart(4, '0')).join('');
  }
}

/**
 * Check if an IP address falls within any of the provided CIDR ranges
 */
export function isIpInAnyRange(ip: string, cidrRanges: string[]): boolean {
  return cidrRanges.some(cidr => isIpInCidrRange(ip, cidr));
}

/**
 * Extract a location object from an IP address using ipinfo.io's batch API
 * This can be used for bulk processing of IP addresses
 */
export async function batchGetLocationFromIps(ipAddresses: string[]): Promise<Record<string, GeoLocation>> {
  // Implement batch processing logic here if needed
  // For now, we'll just call the single function for each IP
  const results: Record<string, GeoLocation> = {};
  
  // Process in batches to avoid rate limiting
  const batchSize = 10;
  for (let i = 0; i < ipAddresses.length; i += batchSize) {
    const batch = ipAddresses.slice(i, i + batchSize);
    const promises = batch.map(async ip => {
      results[ip] = await getLocationFromIp(ip);
    });
    
    await Promise.all(promises);
    
    // Add a small delay between batches to prevent rate limiting
    if (i + batchSize < ipAddresses.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

/**
 * Parse a GPS string into a location object
 * Accepts various formats: "latitude,longitude", "{lat:...,lng:...}", etc.
 */
export function parseGpsLocation(gpsString: string): GeoLocation | null {
  try {
    // Handle comma-separated format
    if (gpsString.includes(',')) {
      const [latStr, lngStr] = gpsString.split(',');
      const latitude = parseFloat(latStr.trim());
      const longitude = parseFloat(lngStr.trim());
      
      if (!isNaN(latitude) && !isNaN(longitude)) {
        return {
          latitude,
          longitude,
          accuracy: 10, // GPS is typically very accurate
          isIpBased: false
        };
      }
    }
    
    // Handle JSON-like format
    if (gpsString.includes('{') && gpsString.includes('}')) {
      try {
        const gpsObject = JSON.parse(gpsString.replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/, '$1"$2":'));
        const latitude = parseFloat(gpsObject.lat || gpsObject.latitude);
        const longitude = parseFloat(gpsObject.lng || gpsObject.longitude);
        
        if (!isNaN(latitude) && !isNaN(longitude)) {
          return {
            latitude,
            longitude,
            accuracy: 10,
            isIpBased: false
          };
        }
      } catch (e) {
        console.error('Error parsing GPS JSON:', e);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing GPS location:', error);
    return null;
  }
}

/**
 * Clear the IP geolocation cache
 */
export const clearIpGeolocationCache = (): void => {
  ipGeolocationCache.clear();
};

/**
 * Get a unique color based on an IP address for visualization purposes
 */
export function getIpBasedColor(ip: string): string {
  if (!ip) return '#3388ff';
  
  // Generate a hash from the IP
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash) + ip.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Get the absolute value
  hash = Math.abs(hash);
  
  // Choose from a set of visually distinct colors
  const colorPalette = [
    '#3388ff', '#ff3333', '#33cc33', '#ff8000', '#8033ff',
    '#ff33cc', '#33ffcc', '#ff6666', '#6666ff', '#ffcc00'
  ];
  
  return colorPalette[hash % colorPalette.length];
}

/**
 * Get the best available IP address for location detection,
 * Only using IPv4 addresses and ignoring IPv6 addresses (which go to default fallback policy)
 * @param ipAddresses Array of IP addresses to choose from
 */
export function getBestIpForGeolocation(ipAddresses: string[]): string | null {
  if (!ipAddresses || ipAddresses.length === 0) return null;
  
  // First, look for Wi-Fi IPv4 addresses
  const wifiIpv4 = ipAddresses.find(ip => 
    !ip.includes(':') && detectNetworkType(ip) === 'wifi'
  );
  
  if (wifiIpv4) return wifiIpv4;
  
  // Next, look for any IPv4 address
  const anyIpv4 = ipAddresses.find(ip => !ip.includes(':'));
  
  if (anyIpv4) return anyIpv4;
  
  // If no IPv4 addresses are found, return null to trigger default fallback policy
  // IPv6 addresses are intentionally ignored as requested
  return null;
}