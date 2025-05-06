import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Plus, Smartphone, Wifi } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import DeviceDetailModal from './DeviceDetailModal';

// Fix for default Leaflet marker icons not displaying properly
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default icon
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Default fallback coordinates (USA center)
const DEFAULT_LAT = 39.8283; // Center of USA
const DEFAULT_LNG = -98.5795;
const DEFAULT_ZOOM = 4;

// Data interfaces for devices and geofences
interface Device {
  id: string;
  name: string;
  displayName?: string; // Added for showing custom display name (like "Device (Network Location)")
  latitude: number;
  longitude: number;
  profileId: string | null;
  model?: string;
  lastSeen?: string | null;
  locationType?: 'ip' | 'gps'; // Type of location data (IP-based or GPS)
  color?: string; // Custom color for device marker
  ipAddress?: string; // The actual IP address
  accuracy?: number; // Accuracy radius in meters
  policyName?: string; // Name of the applied policy
  ipNetworkName?: string; // Name of the matched IP network
}

interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  profileId: string | null;
  color: string;
  borderColor: string;
}

// Map view updater component
const MapViewUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    // Important: In Leaflet, coordinates are [lat, lng] (opposite of GeoJSON)
    if (isValidLatLng(center[0], center[1])) {
      map.setView([center[0], center[1]], zoom);
    } else {
      map.setView([DEFAULT_LAT, DEFAULT_LNG], DEFAULT_ZOOM);
    }
  }, [map, center, zoom]);
  
  return null;
};

// Helper function to validate coordinates
const isValidLatLng = (lat: any, lng: any): boolean => {
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' && 
    !isNaN(lat) && 
    !isNaN(lng) && 
    lat >= -90 && 
    lat <= 90 && 
    lng >= -180 && 
    lng <= 180
  );
};

// Click handler component for adding geofences
const MapClickHandler = ({ onAddGeofence }: { onAddGeofence: (lat: number, lng: number) => void }) => {
  const map = useMap();
  
  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      onAddGeofence(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handleClick);
    
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onAddGeofence]);
  
  return null;
};

interface MapProps {
  devices?: Device[];
  geofences?: Geofence[];
  selectedGeofence?: string | null;
  onSelectGeofence?: (id: string) => void;
  onAddGeofence?: (lat: number, lng: number) => void;
  isAddingGeofence?: boolean;
  center?: [number, number]; // [latitude, longitude]
  zoom?: number;
}

const Map = ({
  devices = [],
  geofences = [],
  selectedGeofence = null,
  onSelectGeofence = () => {},
  onAddGeofence = () => {},
  isAddingGeofence = false,
  center = [DEFAULT_LAT, DEFAULT_LNG], // Default to USA center
  zoom = DEFAULT_ZOOM, // Default zoom level
}: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [validCenter, setValidCenter] = useState<[number, number]>(center);
  const [validZoom, setValidZoom] = useState<number>(zoom);

  useEffect(() => {
    setIsClient(true);
    
    // Validate center coordinates
    if (isValidLatLng(center[0], center[1])) {
      setValidCenter(center);
    } else {
      // Use default USA center
      setValidCenter([DEFAULT_LAT, DEFAULT_LNG]);
    }
    
    setValidZoom(zoom);
  }, [center, zoom]);

  // Handle device click for showing details
  const handleDeviceClick = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setDetailModalOpen(true);
  };

  // Create device icons based on location type
  const createDeviceIcon = (device: Device) => {
    // Different styles for IP-based vs GPS-based locations
    if (device.locationType === 'ip') {
      // Use custom color if provided, or default blue
      const bgColor = device.color || 'rgb(37, 99, 235)';
      const bgColorLighter = device.color ? `${device.color}80` : 'rgba(59, 130, 246, 0.4)'; // 50% opacity
      
      // IP-based location - use a Wifi style icon with custom color
      return L.divIcon({
        className: 'custom-device-marker',
        html: `<div style="
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background-color: ${bgColorLighter};
          border: 2px solid ${bgColor};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.5);
        ">
          <div style="
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: ${bgColor};
          "></div>
        </div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
    } else {
      // GPS-based location - use a solid marker style
      return L.divIcon({
        className: 'custom-device-marker',
        html: `<div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: rgba(220, 38, 38, 0.7);
          border: 2px solid rgb(185, 28, 28);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.5);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
    }
  };

  if (!isClient) {
    return <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>;
  }

  return (
    <>
      <Card className="w-full h-full min-h-[250px]">
        <CardContent className="p-0 relative">
          <div 
            ref={mapContainerRef}
            className="w-full h-[400px] md:h-[600px] rounded-md overflow-hidden" // Increased height for better visibility
          >
            <MapContainer 
              center={[validCenter[0], validCenter[1]]} 
              zoom={validZoom} 
              style={{ height: '100%', width: '100%' }}
              whenCreated={(mapInstance) => {
                // Force a refresh after map is created
                setTimeout(() => {
                  mapInstance.invalidateSize();
                }, 100);
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Update map view when center/zoom props change */}
              <MapViewUpdater center={validCenter} zoom={validZoom} />
              
              {/* Add click handler for adding geofences */}
              {isAddingGeofence && <MapClickHandler onAddGeofence={onAddGeofence} />}
              
              {/* Add device markers and location accuracy circles */}
              {devices.filter(device => isValidLatLng(device.latitude, device.longitude)).map(device => (
                <React.Fragment key={device.id}>
                  {/* Add accuracy circles for IP-based locations */}
                  {device.locationType === 'ip' && device.accuracy && (
                    <Circle
                      center={[device.latitude, device.longitude]}
                      radius={device.accuracy}
                      pathOptions={{
                        color: device.color || '#2563eb',
                        fillColor: device.color || '#2563eb',
                        fillOpacity: 0.05,
                        weight: 1,
                        opacity: 0.3,
                        dashArray: '5, 5' // Dashed line to indicate approximate area
                      }}
                    >
                      <Popup>
                        <div className="p-1 text-xs">
                          <p>IP-based location accuracy</p>
                          <p className="font-medium">
                            Radius: {device.accuracy >= 1000 ? 
                              `${(device.accuracy/1000).toFixed(1)} km` : 
                              `${Math.round(device.accuracy)} m`}
                          </p>
                        </div>
                      </Popup>
                    </Circle>
                  )}

                  {/* Device marker */}
                  <Marker 
                    position={[device.latitude, device.longitude]}
                    icon={createDeviceIcon(device)}
                    eventHandlers={{
                      click: () => handleDeviceClick(device.id)
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h3 className="font-bold flex items-center gap-1 mb-1">
                          {device.locationType === 'ip' ? (
                            <Wifi className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <Smartphone className="h-3.5 w-3.5 text-red-600" />
                          )}
                          {device.displayName || device.name}
                        </h3>
                        {device.model && <p className="text-sm">Model: {device.model}</p>}
                        
                        {/* Show policy info for IP-based locations */}
                        {device.locationType === 'ip' && device.policyName && (
                          <div className="text-xs mt-1 border-t pt-1">
                            <p><strong>Applied Policy:</strong> {device.policyName}</p>
                            {device.ipNetworkName && (
                              <p><strong>Network:</strong> {device.ipNetworkName}</p>
                            )}
                            {device.ipAddress && (
                              <p className="font-mono">{device.ipAddress}</p>
                            )}
                          </div>
                        )}
                        
                        {device.lastSeen && 
                          <p className="text-xs text-gray-500 mt-1">
                            Last seen: {new Date(device.lastSeen).toLocaleString()}
                          </p>
                        }
                        <div className="flex items-center gap-1 text-xs border-t pt-1 mt-1 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {device.locationType === 'ip' ? (
                            <span>Network-based location (approximate)</span>
                          ) : (
                            <span>Device GPS location</span>
                          )}
                        </div>
                        <button 
                          onClick={() => handleDeviceClick(device.id)}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Show detailed information
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}
              
              {/* Add geofence circles */}
              {geofences.filter(geofence => isValidLatLng(geofence.latitude, geofence.longitude)).map(geofence => (
                <Circle
                  key={geofence.id}
                  center={[geofence.latitude, geofence.longitude]}
                  radius={geofence.radius}
                  pathOptions={{
                    color: geofence.borderColor,
                    fillColor: geofence.color,
                    fillOpacity: 0.2,
                    weight: 2,
                    opacity: 0.7
                  }}
                  eventHandlers={{
                    click: () => onSelectGeofence(geofence.id)
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold">{geofence.name}</h3>
                      <p className="text-sm">Radius: {(geofence.radius >= 1000) ? `${(geofence.radius / 1000).toFixed(1)} km` : `${geofence.radius} m`}</p>
                    </div>
                  </Popup>
                </Circle>
              ))}
            </MapContainer>
          </div>
          
          {/* Legend for the map */}
          <div className="absolute bottom-2 left-2 bg-white p-2 rounded shadow-md text-xs">
            <div className="font-semibold mb-1">Map Legend</div>
            <div className="flex items-center gap-1 mb-1">
              <Smartphone className="h-3 w-3 text-red-600" />
              <span>GPS Location</span>
            </div>
            <div className="flex items-center gap-1">
              <Wifi className="h-3 w-3 text-blue-600" />
              <span>IP Location</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Detail Modal */}
      <DeviceDetailModal 
        deviceId={selectedDeviceId}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </>
  );
};

export default Map;
