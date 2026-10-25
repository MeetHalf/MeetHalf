import { useEffect, useRef, useState, memo } from 'react';
import { Box, Alert } from '@mui/material';
import { loadGoogleMaps } from '../lib/googleMapsLoader';

interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  id?: number | string;
  draggable?: boolean;
  label?: string;
  variant?: 'midpoint' | 'place';
  avatarUrl?: string;
  address?: string | null;
  rating?: number;
  placeId?: string;
  status?: 'ongoing' | 'upcoming' | 'ended';
}

interface MapContainerProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  onMarkerClick?: (id: number) => void;
  markers?: Array<MapMarker>;
  highlights?: Array<{ lat: number; lng: number; radius?: number; color?: string; number?: number }>;
  openMarkerId?: number | string | null;
  mapHeight?: string | number;
  routes?: Array<{
    polyline: string;
    color: string;
    username: string;
  }>;
  showRoutes?: boolean;
  onMarkerDragEnd?: (id: number, lat: number, lng: number) => void;
  /** 是否顯示 Google Maps 原生 InfoWindow */
  showInfoWindows?: boolean;
  /** 是否全屏顯示（隱藏地圖控制項） */
  fullscreen?: boolean;
}

const DEFAULT_CENTER = { lat: 25.033, lng: 121.565 }; // 台北

// 生成圓形頭像 SVG marker
function createCircleMarkerIcon(label: string, color: string = '#1769e8'): string {
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

// Brand marker: a quiet halo and center dot reads like a location signal
// without the heavy default Google pin shape.
function createBrandMarkerIcon(color: string, size = 34): string {
  const center = size / 2;
  const outer = size * 0.44;
  const inner = size * 0.27;
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${center}" cy="${center}" r="${outer}" fill="white" fill-opacity=".96" stroke="${color}" stroke-opacity=".18" stroke-width="2"/>
    <circle cx="${center}" cy="${center}" r="${inner}" fill="${color}"/>
    <circle cx="${center}" cy="${center}" r="${size * 0.09}" fill="white" fill-opacity=".9"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createNumberBadgeIcon(number: number): string {
  const svg = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="13" fill="#F28A25" stroke="white" stroke-width="3"/>
    <text x="16" y="16" text-anchor="middle" dominant-baseline="central" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="white">${number}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// 創建集合點 InfoWindow 內容
function createMeetingPointInfoContent(marker: MapMarker): string {
  return `
    <div style="padding: 8px; min-width: 200px;">
      <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #0f172a;">
        ${marker.title}
      </h3>
      ${marker.address ? `
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;">
          ${marker.address}
        </p>
      ` : ''}
      <button 
        id="navigate-btn-${marker.id}"
        style="
          width: 100%;
          padding: 10px 16px;
          background-color: #2F5D8A;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        "
        onmouseover="this.style.backgroundColor='#1d4ed8'"
        onmouseout="this.style.backgroundColor='#2F5D8A'"
      >
        <span>🧭</span>
        <span>開始導航</span>
      </button>
    </div>
  `;
}

function createPlaceInfoContent(marker: MapMarker): string {
  const mapsUrl = marker.placeId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(marker.title)}&query_place_id=${encodeURIComponent(marker.placeId)}`
    : `https://www.google.com/maps/search/?api=1&query=${marker.lat},${marker.lng}`;
  return `
    <div style="padding: 6px 4px 4px; min-width: 220px; font-family: Arial, sans-serif;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div style="min-width:0;">
          <div style="font-size:16px;font-weight:700;color:#142B52;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px;">${marker.title}</div>
          <div style="margin-top:5px;font-size:12px;line-height:1.4;color:#71839A;">${marker.address || ''}</div>
          ${marker.rating != null ? `<div style="margin-top:8px;font-size:12px;font-weight:700;color:#C9650D;">★ ${marker.rating} · Google 評分</div>` : ''}
        </div>
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" aria-label="在 Google Maps 開啟" style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:10px;background:#EEF4FF;color:#2F5D8A;text-decoration:none;font-size:18px;">↗</a>
      </div>
    </div>
  `;
}

function MapContainer({ center = DEFAULT_CENTER, zoom = 13, onMarkerClick, markers = [], highlights = [], openMarkerId = null, mapHeight = '500px', routes = [], showRoutes = false, onMarkerDragEnd, fullscreen = false, showInfoWindows = true }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number | string, google.maps.Marker>>(new Map());
  const highlightsRef = useRef<Map<string, google.maps.Circle>>(new Map());
  const highlightLabelsRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoWindowsRef = useRef<Map<number | string, google.maps.InfoWindow>>(new Map());

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
          zoom,
          // 全屏模式下隱藏所有控制項，避免與自定義 UI 重疊
          mapTypeControl: !fullscreen,
          streetViewControl: false,
          fullscreenControl: !fullscreen,
          zoomControl: !fullscreen,
          scaleControl: !fullscreen,
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

  useEffect(() => { map?.setZoom(zoom); }, [map, zoom]);

  // Add/update markers when map is ready or markers change
  useEffect(() => {
    if (!map) return;

    // 創建一個 Set 來追蹤當前應該存在的標記 ID
    const currentMarkerIds = new Set<number | string>();
    
    // 處理每個標記
    markers.forEach((marker) => {
      // 使用 id 或生成一個唯一 key（基於位置和標題）
      const markerId = marker.id !== undefined 
        ? marker.id 
        : `marker-${marker.lat}-${marker.lng}-${marker.title}`;
      
      currentMarkerIds.add(markerId);
      
      // 檢查標記是否已存在
      const existingMarker = markersRef.current.get(markerId);
      
      if (existingMarker) {
        // 更新現有標記的位置和標題
        const currentPos = existingMarker.getPosition();
        const newPos = new google.maps.LatLng(marker.lat, marker.lng);
        
        // 只有當位置改變時才更新
        if (!currentPos || currentPos.lat() !== marker.lat || currentPos.lng() !== marker.lng) {
          existingMarker.setPosition(newPos);
        }
        
        // 更新標題
        if (existingMarker.getTitle() !== marker.title) {
          existingMarker.setTitle(marker.title);
        }
      } else {
        // 創建新標記
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
        } else if (marker.variant === 'midpoint') {
          markerOptions.icon = {
            url: createBrandMarkerIcon('#2F5D8A', 42),
            scaledSize: new google.maps.Size(42, 42),
            anchor: new google.maps.Point(21, 21),
          };
        } else if (marker.variant === 'place') {
          markerOptions.icon = {
            url: createBrandMarkerIcon('#F28A25', 32),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
          };
        } else if (marker.label) {
          // 根據 label 和 status 決定顏色和樣式
            let color = '#1769e8'; // MeetHalf blue
          if (marker.label === '📍') {
            // 集合地點用更醒目的 pin 圖標
            // 如果是 ongoing，使用紅色並放大
            const isOngoing = marker.status === 'ongoing';
            markerOptions.icon = {
              path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
              fillColor: isOngoing ? '#f28a25' : '#1769e8', // 橘色（ongoing）或藍色（upcoming）
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: isOngoing ? 3 : 2, // ongoing 用更粗的邊框
              scale: isOngoing ? 2.2 : 2, // ongoing 稍微放大
              anchor: new google.maps.Point(12, 22),
            };
          } else if (marker.label === '✅') {
            // 已到達用綠色
            color = '#4caf50';
            markerOptions.icon = {
              url: createCircleMarkerIcon('✓', color),
              scaledSize: new google.maps.Size(48, 48),
              anchor: new google.maps.Point(24, 24),
            };
          } else if (marker.label === '🔴') {
            // Ongoing 活動用紅色脈衝標記
            markerOptions.icon = {
              path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
              fillColor: '#f28a25',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              scale: 2.2,
              anchor: new google.maps.Point(12, 22),
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

        if (typeof marker.id === 'number' && onMarkerClick) {
          const numericMarkerId = marker.id;
          mapMarker.addListener('click', () => onMarkerClick(numericMarkerId));
        }

        // Add drag end listener if marker is draggable and callback is provided
        if (marker.draggable && typeof marker.id === 'number' && onMarkerDragEnd) {
          const numericMarkerId = marker.id;
          mapMarker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
            if (event.latLng) {
              const newLat = event.latLng.lat();
              const newLng = event.latLng.lng();
              onMarkerDragEnd(numericMarkerId, newLat, newLng);
            }
          });
        }

        // 為集合點添加點擊事件和 InfoWindow
        // MapView renders its own accessible bottom sheet. Keep the legacy
        // Google InfoWindow for standalone map usages only so two overlays do
        // not compete for the same marker click.
        if (marker.variant === 'place' && showInfoWindows) {
          const infoWindow = new google.maps.InfoWindow({
            content: createPlaceInfoContent(marker),
            disableAutoPan: true,
          });
          mapMarker.addListener('click', () => {
            infoWindowsRef.current.forEach((window) => window.close());
            infoWindow.open({ map, anchor: mapMarker });
          });
          infoWindowsRef.current.set(markerId, infoWindow);
        } else if (marker.label === '📍' && showInfoWindows && !onMarkerClick) {
          const infoWindow = new google.maps.InfoWindow({
            content: createMeetingPointInfoContent(marker),
          });

          mapMarker.addListener('click', () => {
            // 關閉所有其他 InfoWindow
            infoWindowsRef.current.forEach((iw) => iw.close());
            // 打開當前 InfoWindow
            infoWindow.open(map, mapMarker);
          });

          // 當 InfoWindow 的 DOM 準備好時，添加導航按鈕的事件監聽器
          google.maps.event.addListener(infoWindow, 'domready', () => {
            const navBtn = document.getElementById(`navigate-btn-${marker.id}`);
            if (navBtn) {
              navBtn.addEventListener('click', () => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${marker.lat},${marker.lng}`;
                window.open(url, '_blank');
              });
            }
          });

          // 保存 InfoWindow 引用
          infoWindowsRef.current.set(markerId, infoWindow);
        }

        // 保存到 ref
        markersRef.current.set(markerId, mapMarker);
      }
    });

    // 移除不再存在的標記和 InfoWindow
    markersRef.current.forEach((marker, markerId) => {
      if (!currentMarkerIds.has(markerId)) {
        marker.setMap(null);
        markersRef.current.delete(markerId);
        
        // 同時清理對應的 InfoWindow
        const infoWindow = infoWindowsRef.current.get(markerId);
        if (infoWindow) {
          infoWindow.close();
          infoWindowsRef.current.delete(markerId);
        }
      }
    });
  }, [map, markers, onMarkerDragEnd, onMarkerClick]);

  // A card selection can focus the corresponding map marker and open its
  // compact place details without requiring a second map tap.
  useEffect(() => {
    if (!map || openMarkerId == null) return;
    const marker = markersRef.current.get(openMarkerId);
    const infoWindow = infoWindowsRef.current.get(openMarkerId);
    if (!marker || !infoWindow) return;
    infoWindowsRef.current.forEach((window) => window.close());
    map.panTo(marker.getPosition() || center);
    map.setZoom(Math.max(map.getZoom() || 13, 15));
    infoWindow.open({ map, anchor: marker });
  }, [map, openMarkerId, center]);

  // Subtle candidate halos keep the underlying Google POIs clickable while
  // still showing which places MeetHalf recommends.
  useEffect(() => {
    if (!map) return;
    const active = new Set<string>();
    highlights.forEach((highlight) => {
      const id = `${highlight.lat}:${highlight.lng}`;
      active.add(id);
      const existing = highlightsRef.current.get(id);
      if (existing) {
        existing.setCenter({ lat: highlight.lat, lng: highlight.lng });
        existing.setRadius(highlight.radius ?? 90);
      } else {
        const circle = new google.maps.Circle({
          map,
          center: { lat: highlight.lat, lng: highlight.lng },
          radius: highlight.radius ?? 90,
          strokeColor: highlight.color ?? '#F28A25',
          strokeOpacity: 0.75,
          strokeWeight: 2,
          fillColor: highlight.color ?? '#F28A25',
          fillOpacity: 0.12,
          clickable: false,
        });
        highlightsRef.current.set(id, circle);
      }

      const existingLabel = highlightLabelsRef.current.get(id);
      if (existingLabel) {
        existingLabel.setPosition({ lat: highlight.lat, lng: highlight.lng });
      } else if (highlight.number != null) {
        const label = new google.maps.Marker({
          map,
          position: { lat: highlight.lat, lng: highlight.lng },
          icon: {
            url: createNumberBadgeIcon(highlight.number),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
          },
          clickable: false,
          zIndex: 4,
        });
        highlightLabelsRef.current.set(id, label);
      }
    });
    highlightsRef.current.forEach((circle, id) => {
      if (!active.has(id)) {
        circle.setMap(null);
        highlightsRef.current.delete(id);
      }
    });
    highlightLabelsRef.current.forEach((label, id) => {
      if (!active.has(id)) {
        label.setMap(null);
        highlightLabelsRef.current.delete(id);
      }
    });
  }, [map, highlights]);

  // 組件卸載時清理所有 InfoWindow
  useEffect(() => {
    return () => {
      infoWindowsRef.current.forEach((infoWindow) => {
        infoWindow.close();
      });
      infoWindowsRef.current.clear();
    };
  }, []);

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
        height: fullscreen ? '100%' : mapHeight,
        borderRadius: fullscreen ? 0 : 1,
        overflow: 'hidden',
      }}
    />
  );
}

// 使用 memo 優化，避免不必要的重新渲染
export default memo(MapContainer);
