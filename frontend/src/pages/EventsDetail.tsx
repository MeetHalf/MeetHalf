// import { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import {
//   Box,
//   Typography,
//   Card,
//   CardContent,
//   Alert,
//   Chip,
//   Button,
//   IconButton,
//   Avatar,
//   Divider,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   CircularProgress,
//   Snackbar,
//   Menu,
//   MenuItem,
//   Radio,
//   RadioGroup,
//   FormControlLabel,
//   FormControl,
//   FormLabel,
//   Select,
//   List,
//   ListItem,
//   ListItemButton,
//   ListItemText,
//   InputAdornment,
// } from '@mui/material';
// import {
//   LocationOn as LocationIcon,
//   Person as PersonIcon,
//   Add as AddIcon,
//   Delete as DeleteIcon,
//   ExitToApp as LeaveIcon,
//   GpsFixed as GpsIcon,
//   MoreVert as MoreIcon,
//   Search as SearchIcon,
//   PersonAdd as PersonAddIcon,
//   Edit as EditIcon,
//   ContentCopy as CopyIcon,
// } from '@mui/icons-material';
// import MapContainer from '../components/MapContainer';
// import RouteInfoPanel from '../components/RouteInfoPanel';
// import { eventsApi, membersApi, offlineMembersApi, Event, TimeMidpointResponse, RoutesResponse, Member } from '../api/events';
// import api from '../api/axios';
// import { useAuth } from '../hooks/useAuth';

// export default function GroupDetail() {
//   const { id } = useParams<{ id: string }>();
//   const navigate = useNavigate();
//   const { user } = useAuth();
  
//   // State management
//   const [event, setEvent] = useState<Event | null>(null);
//   const [timeMidpoint, setTimeMidpoint] = useState<TimeMidpointResponse | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
  
//   // Dialog states
//   const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
//   const [deleteEventDialogOpen, setDeleteEventDialogOpen] = useState(false);
//   const [editEventDialogOpen, setEditEventDialogOpen] = useState(false);
//   const [setLocationDialogOpen, setSetLocationDialogOpen] = useState(false);
//   const [newMemberUsername, setNewMemberUsername] = useState('');
//   const [searchAddress, setSearchAddress] = useState('');
//   const [searchResults, setSearchResults] = useState<Array<{ address: string; lat: number; lng: number }>>([]);
//   const [selectedResult, setSelectedResult] = useState<number | null>(null);
//   const [actionLoading, setActionLoading] = useState(false);
//   const [searchLoading, setSearchLoading] = useState(false);
//   const [locationMethod, setLocationMethod] = useState<'auto' | 'search'>('auto');
//   const [travelMode, setTravelMode] = useState<'driving' | 'transit' | 'walking' | 'bicycling' | 'motorcycling'>('driving');
  
//   // Time midpoint states
//   const [calcObjective, setCalcObjective] = useState<'minimize_total' | 'minimize_max'>('minimize_total');
//   const [calculating, setCalculating] = useState(false);
  
//   // Route visualization states
//   const [showRoutes, setShowRoutes] = useState(false);
//   const [routes, setRoutes] = useState<RoutesResponse | null>(null);
//   const [loadingRoutes, setLoadingRoutes] = useState(false);
  
//   // Auto-refresh states
//   const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
//   // ✅ NEW: Offline member states
//   const [addOfflineMemberDialogOpen, setAddOfflineMemberDialogOpen] = useState(false);
//   const [editingOfflineMember, setEditingOfflineMember] = useState<Member | null>(null);
//   const [offlineNickname, setOfflineNickname] = useState('');
//   const [offlineLocation, setOfflineLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
//   const [offlineTravelMode, setOfflineTravelMode] = useState<'driving' | 'transit' | 'walking' | 'bicycling' | 'motorcycling'>('driving');
//   const [offlineLocationMethod, setOfflineLocationMethod] = useState<'auto' | 'search'>('search');
  
//   // Snackbar state
//   const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
  
//   // Copy link states
//   const [linkCopied, setLinkCopied] = useState(false);
  
//   // Edit event states
//   const [editedEventName, setEditedEventName] = useState('');
  
//   // Menu state
//   const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
//   // Current user's member record - get user's name for matching
//   const userName = user?.name || null;
//   // Check if current user is owner or member
//   const currentUserMember = event ? event.members.find(m => m.username === user?.email) : undefined;
//   const isOwner = event ? event.ownerName === user?.email : false;


//   useEffect(() => {
//     if (id) {
//       fetchEventData(true); // Auto-calculate on initial load
//     }
//   }, [id]);

//   // Auto-refresh event data every 1 minute
//   useEffect(() => {
//     if (!id) return;

//     const interval = setInterval(() => {
//       fetchEventData(false); // Don't auto-calculate midpoint on refresh
//       console.log("[Auto Refresh] Group data refreshed");
//     }, 60000); // Every 60 seconds (1 minute)

//     // Cleanup interval on component unmount
//     return () => clearInterval(interval);
//   }, [id]);

//   const fetchEventData = async (autoCalculateMidpoint = false) => {
//     try {
//       setLoading(true);
//       setError(null);
//       const eventResponse = await eventsApi.getEvent(Number(id));
//       setEvent(eventResponse.event);
      
//       // Update last updated time
//       setLastUpdated(new Date());
      
//       // Only fetch midpoint if explicitly requested or on initial load
//       if (autoCalculateMidpoint) {
//         const membersWithLocation = eventResponse.event.members.filter((m: Member) => m.lat && m.lng);
//         if (membersWithLocation.length >= 2) {
//           try {
//             // Use time-based midpoint
//             const timeMidpointResponse = await eventsApi.getTimeMidpoint(Number(id), {
//               objective: calcObjective
//             });
//             setTimeMidpoint(timeMidpointResponse);
            
//           } catch (err: any) {
//             console.error('Could not fetch midpoint:', err);
//             console.error('Error details:', err.response?.data);
//             if (err.response?.status === 500) {
//               setSnackbar({ 
//                 open: true, 
//                 message: `會面點計算失敗: ${err.response?.data?.message || '請稍後再試'}`, 
//                 severity: 'error' 
//               });
//             }
//           }
//         }
//       }
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed to load event');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleAddMember = async () => {
//     if (!event) return;
    
//     try {
//       setActionLoading(true);
      
//       // If user is not a member, add themselves to the event
//       if (!currentUserMember && user?.email) {
//         await membersApi.addMember({
//           username: user.email,
//           eventId: event.id,
//         });
//         setSnackbar({ open: true, message: '成功加入活動！', severity: 'success' });
//       } else if (!user?.id) {
//         // Anonymous user - show message to login
//         setSnackbar({ 
//           open: true, 
//           message: '請先登入以加入活動', 
//           severity: 'info' 
//         });
//         setAddMemberDialogOpen(false);
//         return;
//       } else {
//         // Adding other members by username is not supported in current API
//         // TODO: Implement user lookup by username/email or update backend API
//         setSnackbar({ 
//           open: true, 
//           message: '目前不支援通過使用者名稱添加成員，請使用其他方式', 
//           severity: 'info' 
//         });
//         setNewMemberUsername('');
//       }
      
//       setAddMemberDialogOpen(false);
//       fetchEventData(); // Refresh data
//     } catch (err: any) {
//       let errorMessage = 'Failed to add member';
      
//       if (err.response?.status === 409) {
//         errorMessage = '此用戶已經是活動成員！';
//       } else if (err.response?.status === 404) {
//         errorMessage = '找不到此用戶，請確認使用者名稱是否正確。';
//       } else if (err instanceof Error) {
//         errorMessage = err.message;
//       }
      
//       setSnackbar({ 
//         open: true, 
//         message: errorMessage, 
//         severity: 'error' 
//       });
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const handleSetMyLocation = () => {
//     if (!currentUserMember) {
//       setSnackbar({ open: true, message: '您需要先加入活動才能設定位置', severity: 'error' });
//       return;
//     }
//     setSetLocationDialogOpen(true);
//   };

//   const handleUseCurrentLocation = async () => {
//     if (!navigator.geolocation) {
//       setSnackbar({ open: true, message: '您的瀏覽器不支援定位功能', severity: 'error' });
//       return;
//     }

//     setActionLoading(true);
//     navigator.geolocation.getCurrentPosition(
//       async (position) => {
//         try {
//           const { latitude, longitude } = position.coords;
          
//           // 進行反向地理編碼獲取地址
//           let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
//           try {
//             const reverseGeoResponse = await api.get('/maps/reverse', {
//               params: { lat: latitude, lng: longitude }
//             });
//             if (reverseGeoResponse.data?.address) {
//               address = reverseGeoResponse.data.address;
//             }
//           } catch (reverseErr) {
//             console.warn('反向地理編碼失敗，使用座標作為地址:', reverseErr);
//           }
          
//           await membersApi.updateMemberLocation(currentUserMember!.id, {
//             lat: latitude,
//             lng: longitude,
//             address: address,
//             travelMode: travelMode,
//           });
          
//           setSnackbar({ open: true, message: '位置更新成功！', severity: 'success' });
//           setSetLocationDialogOpen(false);
//           fetchEventData(); // Refresh data
//         } catch (err) {
//           setSnackbar({ 
//             open: true, 
//             message: err instanceof Error ? err.message : '位置更新失敗', 
//             severity: 'error' 
//           });
//         } finally {
//           setActionLoading(false);
//         }
//       },
//       () => {
//         setActionLoading(false);
//         setSnackbar({ open: true, message: '無法取得您的位置', severity: 'error' });
//       }
//     );
//   };

//   // ✅ NEW: Quick set location from member list
//   const handleQuickSetLocation = async (memberId: number) => {
//     if (!navigator.geolocation) {
//       setSnackbar({ open: true, message: '您的瀏覽器不支援定位功能', severity: 'error' });
//       return;
//     }

//     const member = event?.members.find(m => m.id === memberId);
//     if (!member) {
//       setSnackbar({ open: true, message: '找不到成員資訊', severity: 'error' });
//       return;
//     }

//     setActionLoading(true);
//     navigator.geolocation.getCurrentPosition(
//       async (position) => {
//         try {
//           const { latitude, longitude } = position.coords;
          
//           // 進行反向地理編碼獲取地址
//           let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
//           try {
//             const reverseGeoResponse = await api.get('/maps/reverse', {
//               params: { lat: latitude, lng: longitude }
//             });
//             if (reverseGeoResponse.data?.address) {
//               address = reverseGeoResponse.data.address;
//             }
//           } catch (reverseErr) {
//             console.warn('反向地理編碼失敗，使用座標作為地址:', reverseErr);
//           }
          
//           // Use member's current travel mode or default to 'driving'
//           const memberTravelMode = member.travelMode || 'driving';
          
//           await membersApi.updateMemberLocation(memberId, {
//             lat: latitude,
//             lng: longitude,
//             address: address,
//             travelMode: memberTravelMode,
//           });
          
//           setSnackbar({ open: true, message: '位置更新成功！', severity: 'success' });
//           fetchEventData(); // Refresh data
//         } catch (err) {
//           setSnackbar({ 
//             open: true, 
//             message: err instanceof Error ? err.message : '位置更新失敗', 
//             severity: 'error' 
//           });
//         } finally {
//           setActionLoading(false);
//         }
//       },
//       () => {
//         setActionLoading(false);
//         setSnackbar({ open: true, message: '無法取得您的位置', severity: 'error' });
//       }
//     );
//   };

//   const handleSearchLocation = async () => {
//     if (!searchAddress.trim()) {
//       setSnackbar({ open: true, message: '請輸入地址或地點名稱', severity: 'error' });
//       return;
//     }

//     try {
//       setSearchLoading(true);
//       const response = await api.get('/maps/geocode', {
//         params: { address: searchAddress },
//         paramsSerializer: {
//           encode: (param) => encodeURIComponent(param)
//         }
//       });

//       if (response.data.results && response.data.results.length > 0) {
//         const results = response.data.results.slice(0, 5).map((result: any) => ({
//           address: result.formatted_address,
//           lat: result.geometry.location.lat,
//           lng: result.geometry.location.lng,
//         }));
//         setSearchResults(results);
//         setSelectedResult(null);
//         setSnackbar({ open: true, message: `找到 ${results.length} 個結果`, severity: 'success' });
//       } else {
//         setSearchResults([]);
//         setSnackbar({ open: true, message: '找不到相關地點，請嘗試其他關鍵字', severity: 'info' });
//       }
//     } catch (err) {
//       setSnackbar({ 
//         open: true, 
//         message: err instanceof Error ? err.message : '搜尋失敗', 
//         severity: 'error' 
//       });
//       setSearchResults([]);
//     } finally {
//       setSearchLoading(false);
//     }
//   };

//   const handleConfirmSearchLocation = async () => {
//     if (selectedResult === null) {
//       setSnackbar({ open: true, message: '請選擇一個地點', severity: 'error' });
//       return;
//     }

//     const location = searchResults[selectedResult];

//     try {
//       setActionLoading(true);
//       await membersApi.updateMemberLocation(currentUserMember!.id, {
//         lat: location.lat,
//         lng: location.lng,
//         address: location.address,
//         travelMode: travelMode,
//       });
      
//       setSnackbar({ open: true, message: '位置更新成功！', severity: 'success' });
//       setSetLocationDialogOpen(false);
//       setSearchAddress('');
//       setSearchResults([]);
//       setSelectedResult(null);
//       fetchEventData(); // Refresh data
//     } catch (err) {
//       setSnackbar({ 
//         open: true, 
//         message: err instanceof Error ? err.message : '位置更新失敗', 
//         severity: 'error' 
//       });
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const handleLeaveEvent = async () => {
//     if (!currentUserMember) return;
    
//     try {
//       setActionLoading(true);
//       await membersApi.removeMember(currentUserMember.id);
//       setSnackbar({ open: true, message: 'Left group successfully!', severity: 'success' });
//       navigate('/events');
//     } catch (err) {
//       setSnackbar({ 
//         open: true, 
//         message: err instanceof Error ? err.message : 'Failed to leave group', 
//         severity: 'error' 
//       });
//       setActionLoading(false);
//     }
//   };

//   const handleDeleteEvent = async () => {
//     if (!event) return;
    
//     try {
//       setActionLoading(true);
//       await eventsApi.deleteEvent(event.id);
//       setSnackbar({ open: true, message: '活動刪除成功！', severity: 'success' });
//       navigate('/events');
//     } catch (err) {
//       setSnackbar({ 
//         open: true, 
//         message: err instanceof Error ? err.message : '刪除活動失敗', 
//         severity: 'error' 
//       });
//       setActionLoading(false);
//     }
//   };

//   const handleCalculateTimeMidpoint = async () => {
//     if (!event) return;
    
//     try {
//       setCalculating(true);
//       const response = await eventsApi.getTimeMidpoint(event.id, {
//         objective: calcObjective,
//         forceRecalculate: true  // Always force recalculation when manually triggered
//       });
//       setTimeMidpoint(response);
      
//       // If routes are currently shown, refresh them with the new midpoint
//       if (showRoutes) {
//         try {
//           setLoadingRoutes(true);
//           const routesResponse = await eventsApi.getRoutesToMidpoint(event.id, {
//             midpointLat: response.midpoint.lat,
//             midpointLng: response.midpoint.lng
//           });
//           setRoutes(routesResponse);
//         } catch (err) {
//           console.error('Failed to refresh routes:', err);
//           // Don't show error for route refresh failure, just log it
//         } finally {
//           setLoadingRoutes(false);
//         }
//       }
      
//       setSnackbar({ open: true, message: '時間中點計算完成！', severity: 'success' });
//     } catch (err: any) {
//       let errorMessage = '無法計算時間中點';
//       if (err.response?.status === 400) {
//         errorMessage = '至少需要 2 位成員設定位置';
//       } else if (err instanceof Error) {
//         errorMessage = err.message;
//       }
//       setSnackbar({ open: true, message: errorMessage, severity: 'error' });
//     } finally {
//       setCalculating(false);
//     }
//   };

//   const handleToggleRoutes = async () => {
//     if (!event || !timeMidpoint) return;

//     if (!showRoutes) {
//       // Fetch routes
//       try {
//         setLoadingRoutes(true);
//         const response = await eventsApi.getRoutesToMidpoint(event.id, {
//           midpointLat: timeMidpoint.midpoint.lat,
//           midpointLng: timeMidpoint.midpoint.lng
//         });
//         setRoutes(response);
//         setShowRoutes(true);
//       } catch (err) {
//         setSnackbar({ open: true, message: '無法載入路線', severity: 'error' });
//       } finally {
//         setLoadingRoutes(false);
//       }
//     } else {
//       // Hide routes
//       setShowRoutes(false);
//     }
//   };

//   // ✅ NEW: Offline member handlers
//   const handleAddOfflineMember = async () => {
//     if (!event || !offlineNickname.trim() || !offlineLocation) {
//       setSnackbar({ open: true, message: '請填寫完整資訊', severity: 'error' });
//       return;
//     }

//     try {
//       setActionLoading(true);
//       await offlineMembersApi.create({
//         eventId: event.id,
//         nickname: offlineNickname,
//         lat: offlineLocation.lat,
//         lng: offlineLocation.lng,
//         address: offlineLocation.address,
//         travelMode: offlineTravelMode
//       });

//       setSnackbar({ open: true, message: '朋友新增成功！', severity: 'success' });
//       setAddOfflineMemberDialogOpen(false);
//       resetOfflineMemberForm();
//       fetchEventData();
//     } catch (err) {
//       setSnackbar({ 
//         open: true, 
//         message: err instanceof Error ? err.message : '新增失敗', 
//         severity: 'error' 
//       });
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const handleEditOfflineMember = async () => {
//     if (!editingOfflineMember || !offlineNickname.trim()) {
//       return;
//     }

//     try {
//       setActionLoading(true);
//       await offlineMembersApi.update(editingOfflineMember.id, {
//         nickname: offlineNickname,
//         ...(offlineLocation && {
//           lat: offlineLocation.lat,
//           lng: offlineLocation.lng,
//           address: offlineLocation.address
//         }),
//         travelMode: offlineTravelMode
//       });

//       setSnackbar({ open: true, message: '資訊更新成功！', severity: 'success' });
//       setEditingOfflineMember(null);
//       setAddOfflineMemberDialogOpen(false);
//       resetOfflineMemberForm();
//       fetchEventData();
//     } catch (err) {
//       setSnackbar({ 
//         open: true, 
//         message: err instanceof Error ? err.message : '更新失敗', 
//         severity: 'error' 
//       });
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const handleDeleteOfflineMember = async (memberId: number) => {
//     if (!confirm('確定要移除這位朋友嗎？')) {
//       return;
//     }

//     try {
//       setActionLoading(true);
//       await offlineMembersApi.delete(memberId);
//       setSnackbar({ open: true, message: '已移除', severity: 'success' });
//       fetchEventData();
//     } catch (err) {
//       setSnackbar({ 
//         open: true, 
//         message: err instanceof Error ? err.message : '移除失敗', 
//         severity: 'error' 
//       });
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   const resetOfflineMemberForm = () => {
//     setOfflineNickname('');
//     setOfflineLocation(null);
//     setOfflineTravelMode('driving');
//     setSearchAddress('');
//     setSearchResults([]);
//     setSelectedResult(null);
//   };

//   // ✅ NEW: Update individual member travel mode
//   const handleMarkerDragEnd = async (memberId: number, lat: number, lng: number) => {
//     try {
//       // Reverse geocode to get address
//       let address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
//       try {
//         const response = await api.get('/maps/reverse', {
//           params: { lat, lng },
//         });
//         if (response.data?.address) {
//           address = response.data.address;
//         }
//       } catch (err) {
//         console.warn('反向地理編碼失敗，使用座標作為地址:', err);
//         // Continue with update even if reverse geocode fails
//       }
      
//       // Check if this is an offline member
//       const member = event?.members.find(m => m.id === memberId);
//       if (member?.isOffline) {
//         // Update offline member
//         await offlineMembersApi.update(memberId, { lat, lng, address });
//       } else {
//         // Update regular member
//         await membersApi.updateMemberLocation(memberId, { lat, lng, address });
//       }
      
//       setSnackbar({ open: true, message: '位置已更新！請重新計算會面點', severity: 'success' });
      
//       // Only refresh group data, don't recalculate midpoint automatically
//       fetchEventData();
//     } catch (err) {
//       setSnackbar({ 
//         open: true, 
//         message: err instanceof Error ? err.message : '位置更新失敗', 
//         severity: 'error' 
//       });
//     }
//   };

//   const handleUpdateMemberTravelMode = async (memberId: number, travelMode: string) => {
//     try {
//       setActionLoading(true);
      
//       // Check if this is an offline member
//       const member = event?.members.find(m => m.id === memberId);
//       if (member?.isOffline) {
//         // Update offline member
//         await offlineMembersApi.update(memberId, { travelMode });
//       } else {
//         // Update regular member
//         await membersApi.updateMemberLocation(memberId, { travelMode: travelMode as any });
//       }
      
//       setSnackbar({ open: true, message: '交通方式已更新', severity: 'success' });
//       fetchEventData();
//     } catch (err) {
//       setSnackbar({ 
//         open: true, 
//         message: err instanceof Error ? err.message : '更新失敗', 
//         severity: 'error' 
//       });
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   // Copy event link to clipboard
//   const handleCopyEventLink = async () => {
//     if (!event) return;
    
//     const eventUrl = `${window.location.origin}/events/${event.id}`;
    
//     try {
//       await navigator.clipboard.writeText(eventUrl);
//       setLinkCopied(true);
//       setSnackbar({ open: true, message: '活動連結已複製到剪貼簿！', severity: 'success' });
      
//       // Reset copied state after 2 seconds
//       setTimeout(() => setLinkCopied(false), 2000);
//     } catch (err) {
//       setSnackbar({ open: true, message: '複製失敗，請手動複製連結', severity: 'error' });
//     }
//   };

//   // Update event name
//   const handleUpdateEventName = async () => {
//     if (!event || !editedEventName.trim()) return;
    
//     try {
//       setActionLoading(true);
//       await eventsApi.updateEvent(event.id, { name: editedEventName });
//       setSnackbar({ open: true, message: '活動名稱已更新！', severity: 'success' });
//       setEditEventDialogOpen(false);
//       fetchEventData();
//     } catch (err) {
//       setSnackbar({ 
//         open: true, 
//         message: err instanceof Error ? err.message : '更新失敗', 
//         severity: 'error' 
//       });
//     } finally {
//       setActionLoading(false);
//     }
//   };

//   // Prepare markers for map
//   const markers = event ? event.members
//     .filter((m) => m.lat && m.lng)
//     .map((m) => ({
//       id: m.id,
//       lat: m.lat!,
//       lng: m.lng!,
//       title: m.isOffline ? `👤 ${m.nickname}` : (m.username || m.nickname || 'Unknown'),
//       label: m.isOffline 
//         ? m.nickname || 'Friend' 
//         : (m.username?.split('@')[0] || m.nickname || 'User'),
//       draggable: true, // All member markers are draggable
//     })) : [];

//   // Add time-based midpoint marker if available  
//   if (timeMidpoint) {
//     markers.push({
//       id: -1, // Special ID for midpoint marker
//       lat: timeMidpoint.midpoint.lat,
//       lng: timeMidpoint.midpoint.lng,
//       title: `⭐ ${timeMidpoint.midpoint.name}`,
//       label: '⭐',
//       draggable: false, // Midpoint is not draggable
//     });
//   }

//   // Calculate center (prioritize time-based midpoint, then average of all coordinates)
//   const center = timeMidpoint
//     ? timeMidpoint.midpoint
//     : markers.length > 0
//       ? {
//           lat: markers.reduce((sum, m) => sum + m.lat, 0) / markers.length,
//           lng: markers.reduce((sum, m) => sum + m.lng, 0) / markers.length,
//         }
//       : undefined;

//   // Prepare routes with colors for map
//   const routesWithColors = routes?.routes.map((route, index) => ({
//     polyline: route.polyline,
//     color: `hsl(${(index * 360) / (routes.routes.length)}, 70%, 55%)`,
//     username: route.username
//   })) || [];

//   if (loading) {
//     return (
//       <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
//         <CircularProgress />
//       </Box>
//     );
//   }

//   if (error) {
//     return (
//       <Box sx={{ p: 3 }}>
//         <Alert severity="error" sx={{ mb: 3 }}>
//           {error}
//         </Alert>
//         <Button onClick={() => navigate('/events')}>Back to Events</Button>
//       </Box>
//     );
//   }

//   if (!event) {
//     return (
//       <Box sx={{ p: 3 }}>
//         <Alert severity="warning">活動不存在</Alert>
//         <Button onClick={() => navigate('/events')}>返回活動列表</Button>
//       </Box>
//     );
//   }

//   return (
//     <Box sx={{ 
//       minHeight: '100vh', 
//       bgcolor: '#F9FAFB',
//       p: 0,
//       m: 0 
//     }}>
//       {/* Main Content */}
//       <Box sx={{ p: 3 }}>
//         <Box sx={{ 
//           display: 'grid', 
//           gridTemplateColumns: { xs: '1fr', lg: '2fr 3fr' },
//           gap: 3,
//           maxWidth: '1400px',
//           mx: 'auto'
//         }}>
//           {/* Left Column - Event Info & Members */}
//           <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
//             {/* Event Info Card */}
//             <Card sx={{ 
//               borderRadius: 3,
//               boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
//               border: '1px solid #E5E7EB'
//             }}>
//               <CardContent sx={{ p: 3 }}>
//                 <Box sx={{ 
//                   display: 'flex', 
//                   justifyContent: 'space-between', 
//                   alignItems: 'flex-start',
//                   mb: 2
//                 }}>
//                   <Box>
//                     <Typography 
//                       variant="h4" 
//                       sx={{ 
//                         fontWeight: 'bold', 
//                         color: '#111827',
//                         mb: 1
//                       }}
//                     >
//                       🧭 {event.name}
//                     </Typography>
//                     <Chip 
//                       label={`活動 #${event.id}`}
//                       size="small"
//                       sx={{ 
//                         bgcolor: '#F3F4F6',
//                         color: '#374151',
//                         fontWeight: 'medium'
//                       }}
//                     />
//                     {lastUpdated && (
//                       <Typography 
//                         variant="caption" 
//                         sx={{ 
//                           color: '#6B7280',
//                           fontSize: '0.75rem',
//                           ml: 1
//                         }}
//                       >
//                         🔄 自動更新中（每 1 分鐘）• 最後更新：{lastUpdated.toLocaleTimeString()}
//                       </Typography>
//                     )}
//                   </Box>
//                   {isOwner && (
//                     <IconButton 
//                       onClick={(e) => setAnchorEl(e.currentTarget)}
//                       sx={{ 
//                         color: '#6B7280',
//                         '&:hover': { bgcolor: '#F3F4F6' }
//                       }}
//                     >
//                       <MoreIcon />
//                     </IconButton>
//                   )}
//                 </Box>

//                 <Typography 
//                   variant="body1" 
//                   sx={{ 
//                     color: '#6B7280',
//                     lineHeight: 1.6
//                   }}
//                 >
//                   建立者：{event.ownerName} • {event.members.length} 位成員
//                 </Typography>


//               </CardContent>
//             </Card>

//             {/* Members List Card */}
//             <Card sx={{ 
//               borderRadius: 3,
//               boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
//               border: '1px solid #E5E7EB'
//             }}>
//               <CardContent sx={{ p: 3 }}>
//                 <Box sx={{ 
//                   display: 'flex', 
//                   justifyContent: 'space-between', 
//                   alignItems: 'center',
//                   mb: 3
//                 }}>
//                   <Typography 
//                     variant="h6" 
//                     sx={{ 
//                       fontWeight: 'bold', 
//                       color: '#111827'
//                     }}
//                   >
//                     👥 成員列表
//                   </Typography>
//                   <Box sx={{ display: 'flex', gap: 1 }}>
//                     <Button
//                       variant="outlined"
//                       size="small"
//                       startIcon={<AddIcon />}
//                       sx={{ 
//                         borderColor: '#D1D5DB',
//                         color: '#374151',
//                         '&:hover': {
//                           borderColor: '#3B82F6',
//                           bgcolor: '#F3F4F6'
//                         }
//                       }}
//                       onClick={() => setAddMemberDialogOpen(true)}
//                     >
//                       新增成員
//                     </Button>
//                     <Button
//                       variant="outlined"
//                       size="small"
//                       startIcon={<PersonAddIcon />}
//                       sx={{ 
//                         borderColor: '#F59E0B',
//                         color: '#D97706',
//                         '&:hover': {
//                           borderColor: '#F59E0B',
//                           bgcolor: '#FEF3C7'
//                         }
//                       }}
//                       onClick={() => {
//                         resetOfflineMemberForm();
//                         setEditingOfflineMember(null);
//                         setAddOfflineMemberDialogOpen(true);
//                       }}
//                     >
//                       新增離線成員
//                     </Button>
//                   </Box>
//                 </Box>

//                 <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
//                   {event.members.map((member, index) => (
//                     <Box key={member.id}>
//                       <Box sx={{ 
//                         display: 'flex', 
//                         alignItems: 'flex-start', 
//                         gap: 2,
//                         p: 2,
//                         borderRadius: 2,
//                         bgcolor: '#FAFAFA',
//                         border: '1px solid #F3F4F6',
//                         transition: 'all 0.2s ease',
//                         width: '100%',
//                         maxWidth: '100%',
//                         overflow: 'hidden',
//                         '&:hover': {
//                           bgcolor: '#F9FAFB',
//                           borderColor: '#E5E7EB',
//                           transform: 'translateY(-1px)',
//                           boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
//                         }
//                       }}>
//                         <Avatar sx={{ 
//                           bgcolor: member.isOffline 
//                             ? '#F59E0B'  // Orange for offline members
//                             : userName && member.username === userName ? '#3B82F6' : '#6B7280',
//                           width: 40,
//                           height: 40
//                         }}>
//                           {member.isOffline ? '👤' : <PersonIcon />}
//                         </Avatar>
//                         <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
//                           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
//                             <Typography 
//                               variant="body1" 
//                               sx={{ 
//                                 fontWeight: 'medium',
//                                 color: '#111827',
//                                 overflow: 'hidden',
//                                 textOverflow: 'ellipsis',
//                                 whiteSpace: 'nowrap'
//                               }}
//                             >
//                               {member.isOffline ? member.nickname : (member.username || member.nickname || 'Unknown')}
//                               {userName && member.username === userName && ' (You)'}
//                               {event.ownerName === member.username && ' (Owner)'}
//                             </Typography>
//                             {member.isOffline && (
//                               <Chip 
//                                 label="離線成員" 
//                                 size="small" 
//                                 sx={{ 
//                                   bgcolor: '#FEF3C7', 
//                                   color: '#92400E',
//                                   fontSize: '0.7rem'
//                                 }} 
//                               />
//                             )}
//                           </Box>
//                           <Box sx={{ 
//                             display: 'flex', 
//                             alignItems: 'center', 
//                             gap: 1,
//                             mt: 0.5,
//                             flexWrap: 'wrap'
//                           }}>
//                             <LocationIcon sx={{ 
//                               fontSize: 16, 
//                               color: (member.lat && member.lng) ? '#10B981' : '#EF4444'
//                             }} />
//                             <Typography 
//                               variant="body2" 
//                               sx={{ 
//                                 color: (member.lat && member.lng) ? '#10B981' : '#EF4444',
//                                 fontSize: '0.875rem'
//                               }}
//                             >
//                               {member.address || (member.lat && member.lng ? '已定位' : '尚未設定位置')}
//                             </Typography>
//                             {/* ✅ NEW: Quick set location button for current user */}
//                             {!member.isOffline && userName && member.username === userName && !member.lat && !member.lng && (
//                               <Button
//                                 size="small"
//                                 variant="outlined"
//                                 startIcon={<GpsIcon />}
//                                 onClick={() => handleQuickSetLocation(member.id)}
//                                 disabled={actionLoading}
//                                 sx={{
//                                   minWidth: 'auto',
//                                   px: 1.5,
//                                   py: 0.5,
//                                   fontSize: '0.75rem',
//                                   borderColor: '#3B82F6',
//                                   color: '#3B82F6',
//                                   flexShrink: 0,
//                                   whiteSpace: 'nowrap',
//                                   '&:hover': {
//                                     borderColor: '#2563EB',
//                                     bgcolor: '#EBF5FF'
//                                   }
//                                 }}
//                               >
//                                 {actionLoading ? '定位中...' : '取得當前位置'}
//                               </Button>
//                             )}
//                           </Box>
//                           {/* ✅ NEW: Individual travel mode selector for each member */}
//                           <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
//                             <Typography 
//                               variant="body2" 
//                               sx={{ 
//                                 color: '#6B7280',
//                                 fontSize: '0.75rem',
//                                 minWidth: '60px',
//                                 flexShrink: 0
//                               }}
//                             >
//                               交通方式:
//                             </Typography>
//                             <Select
//                               size="small"
//                               value={member.travelMode || 'driving'}
//                               onChange={(e: any) => handleUpdateMemberTravelMode(member.id, e.target.value)}
//                               sx={{ 
//                                 minWidth: 120,
//                                 maxWidth: 200,
//                                 height: 28,
//                                 fontSize: '0.75rem',
//                                 '& .MuiSelect-select': {
//                                   padding: '4px 8px'
//                                 }
//                               }}
//                             >
//                               <MenuItem value="driving">🚗 開車</MenuItem>
//                               <MenuItem value="transit">🚇 大眾運輸</MenuItem>
//                               <MenuItem value="walking">🚶 走路</MenuItem>
//                               <MenuItem value="bicycling">🚴 騎車</MenuItem>
//                             </Select>
//                           </Box>
//                         </Box>
//                         {member.lat && member.lng && (
//                           <Chip 
//                             label="已定位"
//                             size="small"
//                             sx={{ 
//                               bgcolor: '#D1FAE5',
//                               color: '#065F46',
//                               fontSize: '0.75rem'
//                             }}
//                           />
//                         )}
                        
//                         {/* ✅ NEW: Edit/Delete buttons for offline members */}
//                         {member.isOffline && (
//                           <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
//                             <IconButton 
//                               size="small" 
//                               onClick={() => {
//                                 setEditingOfflineMember(member);
//                                 setOfflineNickname(member.nickname || '');
//                                 if (member.lat && member.lng) {
//                                   setOfflineLocation({
//                                     lat: member.lat,
//                                     lng: member.lng,
//                                     address: member.address || ''
//                                   });
//                                 }
//                                 setOfflineTravelMode(member.travelMode as any);
//                                 setAddOfflineMemberDialogOpen(true);
//                               }}
//                               sx={{ color: '#6B7280' }}
//                             >
//                               <EditIcon fontSize="small" />
//                             </IconButton>
//                             <IconButton 
//                               size="small" 
//                               onClick={() => handleDeleteOfflineMember(member.id)}
//                               sx={{ color: '#EF4444' }}
//                             >
//                               <DeleteIcon fontSize="small" />
//                             </IconButton>
//                           </Box>
//                         )}
//                       </Box>
//                       {index < event.members.length - 1 && (
//                         <Divider sx={{ my: 1, opacity: 0.3 }} />
//                       )}
//                     </Box>
//                   ))}
//                 </Box>

//                 {/* 優化目標選擇 */}
//                 <Box sx={{ 
//                   mt: 3,
//                   pt: 3,
//                   borderTop: '1px solid #F3F4F6'
//                 }}>
//                   <Typography variant="body2" sx={{ color: '#6B7280', mb: 2 }}>
//                     💡 會面點計算設定
//                   </Typography>
                  
//                   <FormControl sx={{ width: '100%', mb: 2 }}>
//                     <FormLabel sx={{ fontSize: '0.875rem', mb: 0.5 }}>優化目標</FormLabel>
//                     <Select
//                       value={calcObjective}
//                       onChange={(e) => setCalcObjective(e.target.value as 'minimize_total' | 'minimize_max')}
//                       size="small"
//                       sx={{
//                         fontSize: '0.875rem',
//                         '& .MuiOutlinedInput-notchedOutline': {
//                           borderColor: '#D1D5DB'
//                         }
//                       }}
//                     >
//                       <MenuItem value="minimize_total">總時間最小</MenuItem>
//                       <MenuItem value="minimize_max">最大時間最小</MenuItem>
//                     </Select>
//                   </FormControl>
                  
//                   {/* 重新計算會面點按鈕 */}
//                   <Button
//                     variant="contained"
//                     startIcon={calculating ? <CircularProgress size={20} /> : <GpsIcon />}
//                     sx={{ 
//                       width: '100%',
//                       bgcolor: '#8B5CF6',
//                       '&:hover': { bgcolor: '#7C3AED' }
//                     }}
//                     onClick={handleCalculateTimeMidpoint}
//                     disabled={calculating || actionLoading}
//                   >
//                     {calculating ? '計算中...' : '重新計算會面點'}
//                   </Button>
//                 </Box>

//                 {/* Action Buttons */}
//                 <Box sx={{ 
//                   display: 'flex', 
//                   flexDirection: 'column',
//                   gap: 2, 
//                   mt: 3,
//                   pt: 3,
//                   borderTop: '1px solid #F3F4F6'
//                 }}>
//                   {currentUserMember ? (
//                     <Button
//                       variant="outlined"
//                       startIcon={<LeaveIcon />}
//                       sx={{ 
//                         borderColor: '#D1D5DB',
//                         color: '#374151',
//                         '&:hover': {
//                           borderColor: '#EF4444',
//                           color: '#EF4444'
//                         }
//                       }}
//                       onClick={isOwner ? () => setDeleteEventDialogOpen(true) : handleLeaveEvent}
//                       disabled={actionLoading}
//                     >
//                       {isOwner ? '刪除活動' : '離開活動'}
//                     </Button>
//                   ) : (
//                     <Button
//                       variant="contained"
//                       startIcon={<AddIcon />}
//                       sx={{ 
//                         bgcolor: '#10B981',
//                         '&:hover': { bgcolor: '#059669' }
//                       }}
//                       onClick={() => setAddMemberDialogOpen(true)}
//                       disabled={actionLoading}
//                     >
//                       加入活動
//                     </Button>
//                   )}
//                 </Box>
//               </CardContent>
//             </Card>
//           </Box>

//           {/* Right Column - Map + Route Info */}
//           <Box sx={{ 
//             display: 'flex', 
//             flexDirection: 'column', 
//             gap: 2
//           }}>
//             {/* Map Container */}
//             <Card sx={{ 
//               borderRadius: 3,
//               boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
//               border: '1px solid #E5E7EB',
//               height: { xs: '400px', lg: '500px' },
//               overflow: 'hidden'
//             }}>
//               <MapContainer 
//                 markers={markers}
//                 center={center}
//                 routes={routesWithColors}
//                 showRoutes={showRoutes}
//                 onMarkerDragEnd={handleMarkerDragEnd}
//               />
//             </Card>

//             {/* Route Info Panel */}
//             <Box sx={{ 
//               flex: 1
//             }}>
//               <RouteInfoPanel
//                 timeMidpoint={timeMidpoint}
//                 routes={routes}
//                 showRoutes={showRoutes}
//                 loadingRoutes={loadingRoutes}
//                 calcObjective={calcObjective}
//                 onCalcObjectiveChange={setCalcObjective}
//                 onToggleRoutes={handleToggleRoutes}
//                 event={event}
//               />
//             </Box>
//           </Box>
//         </Box>
//       </Box>

//       {/* Menu */}
//       <Menu
//         anchorEl={anchorEl}
//         open={Boolean(anchorEl)}
//         onClose={() => setAnchorEl(null)}
//       >
//         {isOwner && (
//           <MenuItem onClick={() => {
//             setAnchorEl(null);
//             setEditedEventName(event?.name || '');
//             setEditEventDialogOpen(true);
//           }}>
//             <EditIcon sx={{ mr: 1 }} />
//             編輯活動名稱
//           </MenuItem>
//         )}
//       </Menu>

//       {/* Add Member Dialog */}
//       <Dialog open={addMemberDialogOpen} onClose={() => setAddMemberDialogOpen(false)} maxWidth="sm" fullWidth>
//         <DialogTitle>
//           {currentUserMember ? '新增活動成員' : '加入活動'}
//         </DialogTitle>
//         <DialogContent>
//           {currentUserMember ? (
//             <Box sx={{ py: 2 }}>
//               <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
//                 💡 提示：目前版本尚未支援通過 Email 直接添加成員。
//               </Typography>
//               <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
//                 請將活動連結分享給其他成員，讓他們自行加入活動。他們可以：
//               </Typography>
//               <Typography variant="body2" color="text.secondary" component="ul" sx={{ mt: 1, pl: 3, mb: 3 }}>
//                 <li>訪問此活動頁面</li>
//                 <li>點擊「加入活動」按鈕</li>
//                 <li>設定自己的位置</li>
//               </Typography>
              
//               {/* Copy Group Link Section */}
//               <Box sx={{ 
//                 p: 2, 
//                 bgcolor: '#F3F4F6', 
//                 borderRadius: 2, 
//                 border: '1px solid #E5E7EB' 
//               }}>
//                 <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, color: '#374151' }}>
//                   📋 活動邀請連結
//                 </Typography>
//                 <Box sx={{ 
//                   display: 'flex', 
//                   alignItems: 'center', 
//                   gap: 1,
//                   p: 1,
//                   bgcolor: 'white',
//                   borderRadius: 1,
//                   border: '1px solid #D1D5DB'
//                 }}>
//                   <Typography 
//                     variant="body2" 
//                     sx={{ 
//                       flex: 1, 
//                       fontFamily: 'monospace',
//                       fontSize: '0.8rem',
//                       color: '#6B7280',
//                       wordBreak: 'break-all'
//                     }}
//                   >
//                     {event ? `${window.location.origin}/events/${event.id}` : ''}
//                   </Typography>
//                   <Button
//                     size="small"
//                     variant={linkCopied ? "contained" : "outlined"}
//                     startIcon={<CopyIcon />}
//                     onClick={handleCopyEventLink}
//                     sx={{
//                       minWidth: 'auto',
//                       px: 2,
//                       bgcolor: linkCopied ? '#10B981' : 'transparent',
//                       borderColor: linkCopied ? '#10B981' : '#D1D5DB',
//                       color: linkCopied ? 'white' : '#374151',
//                       '&:hover': {
//                         bgcolor: linkCopied ? '#059669' : '#F3F4F6',
//                         borderColor: linkCopied ? '#059669' : '#9CA3AF'
//                       }
//                     }}
//                   >
//                     {linkCopied ? '已複製' : '複製'}
//                   </Button>
//                 </Box>
//               </Box>
//             </Box>
//           ) : (
//             <Box sx={{ py: 2 }}>
//               <Typography variant="body1" sx={{ mb: 2 }}>
//                 您即將加入活動「{event?.name}」
//               </Typography>
//               <Typography variant="body2" color="text.secondary">
//                 加入後您可以設定自己的位置，並查看活動的聚會中點。
//               </Typography>
//             </Box>
//           )}
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setAddMemberDialogOpen(false)}>
//             {currentUserMember ? '關閉' : '取消'}
//           </Button>
//           {!currentUserMember && (
//             <Button
//               onClick={handleAddMember}
//               variant="contained"
//               disabled={actionLoading}
//               startIcon={actionLoading ? <CircularProgress size={20} /> : <AddIcon />}
//             >
//               {actionLoading ? '處理中...' : '加入活動'}
//             </Button>
//           )}
//         </DialogActions>
//       </Dialog>

//       {/* Set Location Dialog */}
//       <Dialog open={setLocationDialogOpen} onClose={() => setSetLocationDialogOpen(false)} maxWidth="md" fullWidth>
//         <DialogTitle>設定我的位置</DialogTitle>
//         <DialogContent>
//           <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
//             <FormLabel component="legend">選擇交通方式</FormLabel>
//             <RadioGroup
//               row
//               value={travelMode}
//               onChange={(e) => setTravelMode(e.target.value as 'driving' | 'transit' | 'walking' | 'bicycling' | 'motorcycling')}
//               sx={{ mt: 1, mb: 3 }}
//             >
//               <FormControlLabel value="driving" control={<Radio />} label="🚗 開車" />
//               <FormControlLabel value="transit" control={<Radio />} label="🚇 大眾運輸" />
//               <FormControlLabel value="walking" control={<Radio />} label="🚶 走路" />
//               <FormControlLabel value="bicycling" control={<Radio />} label="🚴 騎車" />
//             </RadioGroup>
//           </FormControl>

//           <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
//             <FormLabel component="legend">選擇設定方式</FormLabel>
//             <RadioGroup
//               value={locationMethod}
//               onChange={(e) => setLocationMethod(e.target.value as 'auto' | 'search')}
//               sx={{ mt: 2 }}
//             >
//               <FormControlLabel 
//                 value="auto" 
//                 control={<Radio />} 
//                 label="🎯 使用目前位置（自動定位）" 
//               />
//               <FormControlLabel 
//                 value="search" 
//                 control={<Radio />} 
//                 label="🔍 搜尋地點" 
//               />
//             </RadioGroup>
//           </FormControl>

//           {locationMethod === 'search' && (
//             <Box sx={{ mt: 3 }}>
//               <TextField
//                 fullWidth
//                 label="搜尋地址或地點"
//                 variant="outlined"
//                 value={searchAddress}
//                 onChange={(e) => setSearchAddress(e.target.value)}
//                 placeholder="例如：台北101、台北車站、台北市中正區..."
//                 onKeyPress={(e) => {
//                   if (e.key === 'Enter') {
//                     handleSearchLocation();
//                   }
//                 }}
//                 InputProps={{
//                   endAdornment: (
//                     <InputAdornment position="end">
//                       <IconButton
//                         onClick={handleSearchLocation}
//                         disabled={searchLoading || !searchAddress.trim()}
//                         edge="end"
//                       >
//                         {searchLoading ? <CircularProgress size={20} /> : <SearchIcon />}
//                       </IconButton>
//                     </InputAdornment>
//                   ),
//                 }}
//               />
              
//               {searchResults.length > 0 && (
//                 <Box sx={{ mt: 2 }}>
//                   <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
//                     選擇一個地點：
//                   </Typography>
//                   <List sx={{ 
//                     border: '1px solid #E5E7EB', 
//                     borderRadius: 2, 
//                     maxHeight: 300, 
//                     overflow: 'auto',
//                     bgcolor: 'background.paper'
//                   }}>
//                     {searchResults.map((result, index) => (
//                       <ListItem key={index} disablePadding>
//                         <ListItemButton
//                           selected={selectedResult === index}
//                           onClick={() => setSelectedResult(index)}
//                           sx={{
//                             '&.Mui-selected': {
//                               bgcolor: '#EBF5FF',
//                               '&:hover': {
//                                 bgcolor: '#DBEAFE',
//                               }
//                             }
//                           }}
//                         >
//                           <Avatar sx={{ 
//                             mr: 2, 
//                             bgcolor: selectedResult === index ? '#3B82F6' : '#E5E7EB',
//                             width: 32,
//                             height: 32
//                           }}>
//                             <LocationIcon fontSize="small" />
//                           </Avatar>
//                           <ListItemText
//                             primary={result.address}
//                             secondary={`${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`}
//                             primaryTypographyProps={{
//                               fontSize: '0.95rem',
//                               fontWeight: selectedResult === index ? 'bold' : 'normal'
//                             }}
//                           />
//                         </ListItemButton>
//                       </ListItem>
//                     ))}
//                   </List>
//                 </Box>
//               )}

//               {searchAddress && searchResults.length === 0 && !searchLoading && (
//                 <Alert severity="info" sx={{ mt: 2 }}>
//                   請按 Enter 或點擊搜尋圖示開始搜尋
//                 </Alert>
//               )}
//             </Box>
//           )}

//           {locationMethod === 'auto' && (
//             <Alert severity="info" sx={{ mt: 3 }}>
//               點擊「使用目前位置」後，瀏覽器會請求您的位置權限。允許後，系統會自動取得您的座標。
//             </Alert>
//           )}
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => {
//             setSetLocationDialogOpen(false);
//             setSearchAddress('');
//             setSearchResults([]);
//             setSelectedResult(null);
//           }}>
//             取消
//           </Button>
//           {locationMethod === 'auto' ? (
//             <Button
//               onClick={handleUseCurrentLocation}
//               variant="contained"
//               disabled={actionLoading}
//               startIcon={actionLoading ? <CircularProgress size={20} /> : <GpsIcon />}
//             >
//               {actionLoading ? '定位中...' : '使用目前位置'}
//             </Button>
//           ) : (
//             <Button
//               onClick={handleConfirmSearchLocation}
//               variant="contained"
//               disabled={actionLoading || selectedResult === null}
//               startIcon={actionLoading ? <CircularProgress size={20} /> : <LocationIcon />}
//             >
//               {actionLoading ? '更新中...' : '確認設定'}
//             </Button>
//           )}
//         </DialogActions>
//       </Dialog>

//       {/* ✅ NEW: Add/Edit Offline Member Dialog */}
//       <Dialog 
//         open={addOfflineMemberDialogOpen} 
//         onClose={() => {
//           setAddOfflineMemberDialogOpen(false);
//           setEditingOfflineMember(null);
//           resetOfflineMemberForm();
//         }} 
//         maxWidth="md" 
//         fullWidth
//       >
//         <DialogTitle>
//           {editingOfflineMember ? '編輯離線成員' : '新增離線成員'}
//         </DialogTitle>
//         <DialogContent>
//           <TextField
//             fullWidth
//             label="名字"
//             variant="outlined"
//             value={offlineNickname}
//             onChange={(e) => setOfflineNickname(e.target.value)}
//             placeholder="例如：小明、王媽媽..."
//             sx={{ mt: 2, mb: 2 }}
//           />

//           <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
//             <FormLabel component="legend">選擇交通方式</FormLabel>
//             <RadioGroup
//               row
//               value={offlineTravelMode}
//               onChange={(e) => setOfflineTravelMode(e.target.value as any)}
//               sx={{ mt: 1, mb: 3 }}
//             >
//               <FormControlLabel value="driving" control={<Radio />} label="🚗 開車" />
//               <FormControlLabel value="transit" control={<Radio />} label="🚇 大眾運輸" />
//               <FormControlLabel value="walking" control={<Radio />} label="🚶 走路" />
//               <FormControlLabel value="bicycling" control={<Radio />} label="🚴 騎車" />
//             </RadioGroup>
//           </FormControl>

//           <FormControl component="fieldset" sx={{ mt: 2, width: '100%' }}>
//             <FormLabel component="legend">設定位置</FormLabel>
//             <RadioGroup
//               value={offlineLocationMethod}
//               onChange={(e) => setOfflineLocationMethod(e.target.value as 'auto' | 'search')}
//               sx={{ mt: 2 }}
//             >
//               <FormControlLabel 
//                 value="search" 
//                 control={<Radio />} 
//                 label="🔍 搜尋地點" 
//               />
//             </RadioGroup>
//           </FormControl>

//           {/* Reuse the existing location search UI */}
//           <Box sx={{ mt: 3 }}>
//             <TextField
//               fullWidth
//               label="搜尋地址或地點"
//               variant="outlined"
//               value={searchAddress}
//               onChange={(e) => setSearchAddress(e.target.value)}
//               placeholder="例如：台北101、台北車站..."
//               onKeyPress={(e) => {
//                 if (e.key === 'Enter') {
//                   handleSearchLocation();
//                 }
//               }}
//               InputProps={{
//                 endAdornment: (
//                   <InputAdornment position="end">
//                     <IconButton
//                       onClick={handleSearchLocation}
//                       disabled={searchLoading || !searchAddress.trim()}
//                       edge="end"
//                     >
//                       {searchLoading ? <CircularProgress size={20} /> : <SearchIcon />}
//                     </IconButton>
//                   </InputAdornment>
//                 ),
//               }}
//             />
            
//             {searchResults.length > 0 && (
//               <Box sx={{ mt: 2 }}>
//                 <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
//                   選擇一個地點：
//                 </Typography>
//                 <List sx={{ border: '1px solid #E5E7EB', borderRadius: 2, maxHeight: 300, overflow: 'auto' }}>
//                   {searchResults.map((result, index) => (
//                     <ListItem key={index} disablePadding>
//                       <ListItemButton
//                         selected={selectedResult === index}
//                         onClick={() => {
//                           setSelectedResult(index);
//                           setOfflineLocation(result);
//                         }}
//                       >
//                         <Avatar sx={{ mr: 2, bgcolor: selectedResult === index ? '#3B82F6' : '#E5E7EB' }}>
//                           <LocationIcon fontSize="small" />
//                         </Avatar>
//                         <ListItemText
//                           primary={result.address}
//                           secondary={`${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`}
//                         />
//                       </ListItemButton>
//                     </ListItem>
//                   ))}
//                 </List>
//               </Box>
//             )}
//           </Box>

//           {offlineLocation && (
//             <Alert severity="success" sx={{ mt: 2 }}>
//               已選擇位置：{offlineLocation.address || `${offlineLocation.lat.toFixed(4)}, ${offlineLocation.lng.toFixed(4)}`}
//             </Alert>
//           )}
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => {
//             setAddOfflineMemberDialogOpen(false);
//             setEditingOfflineMember(null);
//             resetOfflineMemberForm();
//           }}>
//             取消
//           </Button>
//           <Button
//             onClick={editingOfflineMember ? handleEditOfflineMember : handleAddOfflineMember}
//             variant="contained"
//             disabled={actionLoading || !offlineNickname.trim() || !offlineLocation}
//             startIcon={actionLoading ? <CircularProgress size={20} /> : null}
//             sx={{ 
//               bgcolor: '#F59E0B',
//               '&:hover': { bgcolor: '#D97706' }
//             }}
//           >
//             {actionLoading ? '處理中...' : editingOfflineMember ? '更新' : '新增'}
//           </Button>
//         </DialogActions>
//       </Dialog>

//       {/* Edit Event Dialog */}
//       <Dialog open={editEventDialogOpen} onClose={() => setEditEventDialogOpen(false)} maxWidth="sm" fullWidth>
//         <DialogTitle>編輯活動名稱</DialogTitle>
//         <DialogContent>
//           <TextField
//             fullWidth
//             label="活動名稱"
//             value={editedEventName}
//             onChange={(e) => setEditedEventName(e.target.value)}
//             sx={{ mt: 2 }}
//             autoFocus
//           />
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setEditEventDialogOpen(false)}>取消</Button>
//           <Button
//             onClick={handleUpdateEventName}
//             variant="contained"
//             disabled={actionLoading || !editedEventName.trim()}
//             startIcon={actionLoading ? <CircularProgress size={20} /> : null}
//           >
//             {actionLoading ? '更新中...' : '更新'}
//           </Button>
//         </DialogActions>
//       </Dialog>

//       {/* Delete Event Dialog */}
//       <Dialog open={deleteEventDialogOpen} onClose={() => setDeleteEventDialogOpen(false)}>
//         <DialogTitle>刪除活動</DialogTitle>
//         <DialogContent>
//           <Typography>
//             確定要刪除「{event?.name}」嗎？此操作無法復原。
//           </Typography>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setDeleteEventDialogOpen(false)}>取消</Button>
//           <Button
//             onClick={handleDeleteEvent}
//             color="error"
//             variant="contained"
//             disabled={actionLoading}
//             startIcon={actionLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
//           >
//             {actionLoading ? '刪除中...' : '刪除'}
//           </Button>
//         </DialogActions>
//       </Dialog>

//       {/* Snackbar */}
//       <Snackbar
//         open={snackbar.open}
//         autoHideDuration={6000}
//         onClose={() => setSnackbar({ ...snackbar, open: false })}
//       >
//         <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
//           {snackbar.message}
//         </Alert>
//       </Snackbar>
//     </Box>
//   );
// }