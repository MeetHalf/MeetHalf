import { useEffect, useRef, useState, memo } from 'react';
import { Box, Alert } from '@mui/material';
import { loadGoogleMaps } from '../lib/googleMapsLoader';

interface MapContainerProps {
  center?: { lat: number; lng: number };
  markers?: Array<{ 
    lat: number; 
    lng: number; 
    title: string;
    id?: number;
    draggable?: boolean;
    label?: string;
    avatarUrl?: string;
  }>;
  routes?: Array<{
    polyline: string;
    color: string;
    username: string;
  }>;
  showRoutes?: boolean;
  onMarkerDragEnd?: (id: number, lat: number, lng: number) => void;
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

function MapContainer({ center = DEFAULT_CENTER, markers = [], routes = [], showRoutes = false, onMarkerDragEnd }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // 初始化地圖（只運行一次）
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_JS_KEY;

    if (!apiKey) {
      setError('Google Maps API key 未設定。請在 .env 檔案中設定 VITE_GOOGLE_MAPS_JS_KEY');
      return;
    }

    loadGoogleMaps()
      .then(() => {
        if (!mapRef.current) return;

        const mapInstance = new google.maps.Map(mapRef.current, {
          center: center || DEFAULT_CENTER,
          zoom: 13,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        setMap(mapInstance);
      })
      .catch((err) => {
        console.error('Google Maps 載入失敗:', err);
        setError('Google Maps 載入失敗。請檢查 API key 是否有效。');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在組件掛載時初始化一次

  // 更新地圖中心點（不重新創建地圖）
  useEffect(() => {
    if (!map || !center) return;
    
    map.setCenter(center);
  }, [map, center]);

  // Add markers when map is ready
  useEffect(() => {
    if (!map) return;

    // Clear existing markers (in a real app, we'd track these)
    const googleMarkers: google.maps.Marker[] = [];

    markers.forEach((marker) => {
      const markerOptions: google.maps.MarkerOptions = {
        position: { lat: marker.lat, lng: marker.lng },
        map,
        title: marker.title,
        draggable: marker.draggable || false,
      };

      // 如果有 avatarUrl，使用頭像圖片
      if (marker.avatarUrl) {
        markerOptions.icon = {
          url: marker.avatarUrl,
          scaledSize: new google.maps.Size(48, 48),
          anchor: new google.maps.Point(24, 24),
        };
      } else if (marker.label) {
        // 根據 label 決定顏色
        let color = '#2196f3'; // 默認藍色
        if (marker.label === '📍') {
          // 集合地點用紅色 pin，不用圓形
          markerOptions.icon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#f44336',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
          };
        } else if (marker.label === '✅') {
          // 已到達用綠色
          color = '#4caf50';
          markerOptions.icon = {
            url: createCircleMarkerIcon('✓', color),
            scaledSize: new google.maps.Size(48, 48),
            anchor: new google.maps.Point(24, 24),
          };
        } else {
          // 其他成員用藍色圓形頭像
          markerOptions.icon = {
            url: createCircleMarkerIcon(marker.label, color),
            scaledSize: new google.maps.Size(48, 48),
            anchor: new google.maps.Point(24, 24),
          };
        }
      }

      const mapMarker = new google.maps.Marker(markerOptions);

      // Add drag end listener if marker is draggable and callback is provided
      if (marker.draggable && marker.id !== undefined && onMarkerDragEnd) {
        mapMarker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const newLat = event.latLng.lat();
            const newLng = event.latLng.lng();
            onMarkerDragEnd(marker.id!, newLat, newLng);
          }
        });
      }

      googleMarkers.push(mapMarker);
    });

    // Cleanup
    return () => {
      googleMarkers.forEach((m) => m.setMap(null));
    };
  }, [map, markers, onMarkerDragEnd]);

  // Add polyline routes when available
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

    // Cleanup
    return () => {
      polylines.forEach((p) => p.setMap(null));
    };
  }, [map, routes, showRoutes]);

  if (error) {
    return (
      <Box sx={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      ref={mapRef}
      sx={{
        width: '100%',
        height: '500px',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    />
  );
}

// 使用 memo 優化，避免不必要的重新渲染
export default memo(MapContainer, (prevProps, nextProps) => {
  // 比較 center
  const centerEqual = 
    prevProps.center?.lat === nextProps.center?.lat &&
    prevProps.center?.lng === nextProps.center?.lng;

  // 比較 markers（淺比較，處理 undefined）
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

  // 比較其他 props（處理 undefined）
  const prevRoutes = prevProps.routes || [];
  const nextRoutes = nextProps.routes || [];
  const routesEqual = prevRoutes.length === nextRoutes.length;
  const showRoutesEqual = prevProps.showRoutes === nextProps.showRoutes;

  return centerEqual && markersEqual && routesEqual && showRoutesEqual;
});

