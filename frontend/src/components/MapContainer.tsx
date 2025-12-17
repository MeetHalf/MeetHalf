import { useEffect, useRef, useState, memo } from 'react';
import { loadGoogleMaps } from '../lib/googleMapsLoader';

interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  id?: number;
  draggable?: boolean;
  label?: string;
  avatarUrl?: string;
  isArrived?: boolean;
  isCurrentUser?: boolean;
}

interface MapContainerProps {
  center?: { lat: number; lng: number };
  markers?: MapMarker[];
  routes?: Array<{
    polyline: string;
    color: string;
    username: string;
  }>;
  showRoutes?: boolean;
  onMarkerDragEnd?: (id: number, lat: number, lng: number) => void;
  fullScreen?: boolean;
}

const DEFAULT_CENTER = { lat: 25.033, lng: 121.565 }; // 台北

// 生成圓形頭像 SVG marker
function createCircleMarkerIcon(label: string, color: string = '#2196f3'): string {
  const svg = `
    <svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="${color}" stroke="white" stroke-width="3"/>
      <text x="24" y="24" font-family="Arial, sans-serif" font-size="18" font-weight="bold" 
            fill="white" text-anchor="middle" dominant-baseline="central">
        ${label}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// Sticker-style marker component for fallback map
function StickerMarker({ 
  member, 
  centerLat, 
  centerLng, 
  scale 
}: { 
  member: MapMarker; 
  centerLat: number; 
  centerLng: number;
  scale: number;
}) {
  if (!member.lat || !member.lng || member.label === '📍') return null;
  
  const dy = (centerLat - member.lat) * scale;
  const dx = (member.lng - centerLng) * scale;
  const isArrived = member.isArrived || member.label === '✅';
  const isCurrentUser = member.isCurrentUser;

  return (
    <div 
      className="absolute transition-all duration-1000 ease-in-out z-20 animate-bounce-subtle"
      style={{ 
        top: `calc(50% + ${dy}px)`, 
        left: `calc(50% + ${dx}px)`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="sticker-container">
        <div className={`
          sticker-avatar shadow-lg border-2
          ${isCurrentUser ? 'border-blue-500' : isArrived ? 'border-green-500' : 'border-slate-300'}
        `}>
          <div className={`
            w-full h-full flex items-center justify-center text-lg font-black
            ${isArrived 
              ? 'bg-green-500 text-white' 
              : isCurrentUser 
                ? 'bg-blue-50 text-blue-600' 
                : 'bg-slate-50 text-slate-500'
            }
          `}>
            {isArrived ? '✓' : member.label || '?'}
          </div>
          <div className={`
            absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full
            ${isArrived ? 'bg-green-500' : 'bg-blue-500'}
          `} />
        </div>
        <div className="sticker-tail" />
      </div>
      {member.title && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[10px] font-bold text-slate-600 bg-white/80 px-2 py-0.5 rounded-full">
            {member.title.split(' - ')[0]}
          </span>
        </div>
      )}
    </div>
  );
}

// Fallback map when no API key
function FallbackMap({ center, markers }: { center: { lat: number; lng: number }; markers: MapMarker[] }) {
  const SCALE = 45000; // Scale factor for converting lat/lng to pixels

  return (
    <div className="relative w-full h-full bg-slate-50 overflow-hidden">
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{ 
          backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)', 
          backgroundSize: '60px 60px' 
        }}
      />
      
      {/* Pulsing Meeting Point */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="pulse-ring" />
        <div className="w-10 h-10 bg-blue-600 rounded-full shadow-lg border-4 border-white flex items-center justify-center relative z-10">
          <span className="text-white text-[8px] font-black">MEET</span>
        </div>
      </div>

      {/* Member Stickers */}
      {markers.filter(m => m.label !== '📍').map((member, idx) => (
        <StickerMarker
          key={member.id || idx}
          member={member}
          centerLat={center.lat}
          centerLng={center.lng}
          scale={SCALE}
        />
      ))}

      {/* Map Info */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
        <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            簡易地圖模式
          </span>
        </div>
        <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold text-slate-600">
            {markers.filter(m => m.label !== '📍').length} 位成員
          </span>
        </div>
      </div>
    </div>
  );
}

function MapContainer({ 
  center = DEFAULT_CENTER, 
  markers = [], 
  routes = [], 
  showRoutes = false, 
  onMarkerDragEnd,
  fullScreen = false,
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [useApiKey, setUseApiKey] = useState(true);

  // Check for API key
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_JS_KEY;
    if (!apiKey) {
      setUseApiKey(false);
    }
  }, []);

  // 初始化地圖（只運行一次）
  useEffect(() => {
    if (!useApiKey) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_JS_KEY;

    if (!apiKey) {
      setError('Google Maps API key 未設定');
      return;
    }

    loadGoogleMaps()
      .then(() => {
        if (!mapRef.current) return;

        const mapInstance = new google.maps.Map(mapRef.current, {
          center: center || DEFAULT_CENTER,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "simplified" }] },
          ],
        });

        setMap(mapInstance);
      })
      .catch((err) => {
        console.error('Google Maps 載入失敗:', err);
        setError('Google Maps 載入失敗');
        setUseApiKey(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useApiKey]);

  // 更新地圖中心點
  useEffect(() => {
    if (!map || !center) return;
    map.setCenter(center);
  }, [map, center]);

  // Add markers
  useEffect(() => {
    if (!map) return;

    const googleMarkers: google.maps.Marker[] = [];

    markers.forEach((marker) => {
      const markerOptions: google.maps.MarkerOptions = {
        position: { lat: marker.lat, lng: marker.lng },
        map,
        title: marker.title,
        draggable: marker.draggable || false,
      };

      if (marker.avatarUrl) {
        markerOptions.icon = {
          url: marker.avatarUrl,
          scaledSize: new google.maps.Size(48, 48),
          anchor: new google.maps.Point(24, 24),
        };
      } else if (marker.label) {
        let color = '#3b82f6'; // Default blue
        
        if (marker.label === '📍') {
          // Meeting point - red circle with pulse effect
          markerOptions.icon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 3,
          };
        } else if (marker.label === '✅' || marker.isArrived) {
          // Arrived - green
          color = '#22c55e';
          markerOptions.icon = {
            url: createCircleMarkerIcon('✓', color),
            scaledSize: new google.maps.Size(48, 48),
            anchor: new google.maps.Point(24, 24),
          };
        } else {
          // Member - blue circle with initial
          if (marker.isCurrentUser) {
            color = '#3b82f6';
          }
          markerOptions.icon = {
            url: createCircleMarkerIcon(marker.label, color),
            scaledSize: new google.maps.Size(48, 48),
            anchor: new google.maps.Point(24, 24),
          };
        }
      }

      const mapMarker = new google.maps.Marker(markerOptions);

      if (marker.draggable && marker.id !== undefined && onMarkerDragEnd) {
        mapMarker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            onMarkerDragEnd(marker.id!, event.latLng.lat(), event.latLng.lng());
          }
        });
      }

      googleMarkers.push(mapMarker);
    });

    return () => {
      googleMarkers.forEach((m) => m.setMap(null));
    };
  }, [map, markers, onMarkerDragEnd]);

  // Add polyline routes
  useEffect(() => {
    if (!map || !showRoutes || routes.length === 0) return;

    const polylines: google.maps.Polyline[] = [];

    routes.forEach((route) => {
      const decodedPath = google.maps.geometry.encoding.decodePath(route.polyline);
      
      const polyline = new google.maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: route.color,
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map
      });

      polylines.push(polyline);
    });

    return () => {
      polylines.forEach((p) => p.setMap(null));
    };
  }, [map, routes, showRoutes]);

  // Fallback map (no API key or error)
  if (!useApiKey || error) {
    return (
      <div className={`w-full ${fullScreen ? 'h-full' : 'h-[500px] rounded-xl'} overflow-hidden`}>
        <FallbackMap center={center} markers={markers} />
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`w-full ${fullScreen ? 'h-full' : 'h-[500px] rounded-xl'} overflow-hidden`}
    />
  );
}

// 使用 memo 優化
export default memo(MapContainer, (prevProps, nextProps) => {
  const centerEqual = 
    prevProps.center?.lat === nextProps.center?.lat &&
    prevProps.center?.lng === nextProps.center?.lng;

  const prevMarkers = prevProps.markers || [];
  const nextMarkers = nextProps.markers || [];
  
  const markersEqual = 
    prevMarkers.length === nextMarkers.length &&
    prevMarkers.every((marker, idx) => {
      const nextMarker = nextMarkers[idx];
      return (
        marker.lat === nextMarker.lat &&
        marker.lng === nextMarker.lng &&
        marker.title === nextMarker.title &&
        marker.label === nextMarker.label
      );
    });

  const prevRoutes = prevProps.routes || [];
  const nextRoutes = nextProps.routes || [];
  const routesEqual = prevRoutes.length === nextRoutes.length;
  const showRoutesEqual = prevProps.showRoutes === nextProps.showRoutes;
  const fullScreenEqual = prevProps.fullScreen === nextProps.fullScreen;

  return centerEqual && markersEqual && routesEqual && showRoutesEqual && fullScreenEqual;
});
