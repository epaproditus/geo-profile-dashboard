import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Plus } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import DeviceDetailModal from './DeviceDetailModal';

// Fix for default Leaflet marker icons not displaying properly
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Data interfaces for devices and geofences
interface Device {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  profileId: string | null;
  model?: string;
  lastSeen?: string | null;
}

interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  profileId: string | null;
}

interface MapProps {
  devices?: Device[];
  geofences?: Geofence[];
  selectedGeofence?: string | null;
  onSelectGeofence?: (id: string | null) => void;
  onAddGeofence?: (lat: number, lng: number) => void;
  isAddingGeofence?: boolean;
  center?: [number, number]; // [longitude, latitude]
  zoom?: number;
}

// Map view updater component
const MapViewUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center[1], center[0]], zoom);
  }, [map, center, zoom]);
  
  return null;
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

const Map = ({
  devices = [],
  geofences = [],
  selectedGeofence = null,
  onSelectGeofence = () => {},
  onAddGeofence = () => {},
  isAddingGeofence = false,
  center = [-97.98, 26.30], // Default: Your iPhone's location
  zoom = 12,
}: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Create device icons
  const createDeviceIcon = (device: Device) => {
    // Create custom device icon
    return L.divIcon({
      className: 'custom-device-marker',
      html: `<div style="
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: rgba(0, 123, 255, 0.5);
        border: 2px solid #007bff;
        display: flex;
        align-items: center;
        justify-content: center;
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  // Handle device marker click to show detailed modal
  const handleDeviceClick = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setDetailModalOpen(true);
  };

  return (
    <>
      <Card className="w-full h-full min-h-[250px]">
        <CardContent className="p-0 relative">
          <div 
            ref={mapContainerRef}
            className="w-full h-[250px] rounded-md overflow-hidden"
          >
            <MapContainer 
              center={[center[1], center[0]]} // OpenStreetMap uses [lat, lng] format
              zoom={zoom} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Update map view when center/zoom props change */}
              <MapViewUpdater center={center} zoom={zoom} />
              
              {/* Add click handler for adding geofences */}
              {isAddingGeofence && <MapClickHandler onAddGeofence={onAddGeofence} />}
              
              {/* Add device markers */}
              {devices.map(device => (
                <Marker 
                  key={device.id}
                  position={[device.latitude, device.longitude]}
                  icon={createDeviceIcon(device)}
                  eventHandlers={{
                    click: () => handleDeviceClick(device.id)
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold">{device.name}</h3>
                      {device.model && <p className="text-sm">Model: {device.model}</p>}
                      {device.lastSeen && 
                        <p className="text-sm text-gray-500">
                          Last seen: {new Date(device.lastSeen).toLocaleString()}
                        </p>
                      }
                      <button 
                        onClick={() => handleDeviceClick(device.id)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Show detailed information
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* Add geofence circles */}
              {geofences.map(geofence => (
                <Circle
                  key={geofence.id}
                  center={[geofence.latitude, geofence.longitude]}
                  radius={geofence.radius}
                  pathOptions={{
                    color: selectedGeofence === geofence.id ? '#dc3545' : '#28a745',
                    fillColor: selectedGeofence === geofence.id ? '#dc3545' : '#28a745',
                    fillOpacity: 0.2,
                  }}
                  eventHandlers={{
                    click: () => onSelectGeofence(geofence.id)
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold">{geofence.name}</h3>
                      <p className="text-sm">Radius: {geofence.radius}m</p>
                    </div>
                  </Popup>
                </Circle>
              ))}
            </MapContainer>
          </div>
          
          {isAddingGeofence && (
            <div className="absolute bottom-4 left-4 bg-card p-3 rounded-md border shadow-md">
              <p className="text-xs text-muted-foreground mb-2">
                Click on the map to place a new geofence
              </p>
            </div>
          )}
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
