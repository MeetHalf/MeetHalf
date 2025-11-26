import { useEffect, useRef, useState } from 'react';
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
  }>;
  routes?: Array<{
    polyline: string;
    color: string;
    memberEmail: string;
  }>;
  showRoutes?: boolean;
  onMarkerDragEnd?: (id: number, lat: number, lng: number) => void;
}

const DEFAULT_CENTER = { lat: 25.033, lng: 121.565 }; // 台北

export default function MapContainer({ center = DEFAULT_CENTER, markers = [], routes = [], showRoutes = false, onMarkerDragEnd }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

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
          center,
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
  }, [center]);

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

      // Add label if provided
      if (marker.label) {
        markerOptions.label = {
          text: marker.label,
          fontSize: '12px',
          fontWeight: '600',
          color: '#1F2937',
        };
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


