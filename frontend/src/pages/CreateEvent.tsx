import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { 
  ArrowLeft, 
  MapPin, 
  Copy, 
  Share2, 
  X, 
  Calendar,
  Clock,
  Loader2,
  CheckCircle,
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { eventsApi } from '../api/events';
import { loadGoogleMaps } from '../lib/googleMapsLoader';

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    useMeetHalf: false,
    meetingPointName: '',
    meetingPointAddress: '',
    meetingPointLat: null as number | null,
    meetingPointLng: null as number | null,
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [eventId, setEventId] = useState<number | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info',
  });

  // Load Google Maps API
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsLoaded(true))
      .catch((err) => {
        console.error('Failed to load Google Maps:', err);
        setSnackbar({ open: true, message: 'Google Maps 載入失敗', severity: 'error' });
      });
  }, []);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (
      !formData.useMeetHalf &&
      mapsLoaded &&
      autocompleteInputRef.current &&
      !autocompleteRef.current &&
      typeof google !== 'undefined' &&
      google.maps?.places
    ) {
      const autocomplete = new google.maps.places.Autocomplete(autocompleteInputRef.current, {
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'tw' },
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry?.location) {
          setSnackbar({ open: true, message: '找不到該地點的位置資訊', severity: 'error' });
          return;
        }

        setFormData((prev) => ({
          ...prev,
          meetingPointName: place.name || place.formatted_address || '',
          meetingPointAddress: place.formatted_address || '',
          meetingPointLat: place.geometry!.location!.lat(),
          meetingPointLng: place.geometry!.location!.lng(),
        }));

        setSnackbar({ open: true, message: '地點已選擇', severity: 'success' });
      });

      autocompleteRef.current = autocomplete;
    }

    if (formData.useMeetHalf && autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }
  }, [formData.useMeetHalf, mapsLoaded]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setSnackbar({ open: true, message: '請輸入聚會名稱', severity: 'error' });
      return;
    }
    
    if (formData.startTime >= formData.endTime) {
      setSnackbar({ open: true, message: '結束時間必須晚於開始時間', severity: 'error' });
      return;
    }
    
    if (!formData.useMeetHalf && !formData.meetingPointName) {
      setSnackbar({ open: true, message: '請選擇集合地點或使用 MeetHalf', severity: 'error' });
      return;
    }
    
    setSubmitting(true);
    
    try {
      const requestData: any = {
        name: formData.name.trim(),
        startTime: formData.startTime.toISOString(),
        endTime: formData.endTime.toISOString(),
        useMeetHalf: formData.useMeetHalf,
        meetingPointName: formData.useMeetHalf ? null : formData.meetingPointName,
        meetingPointAddress: formData.useMeetHalf ? null : formData.meetingPointAddress,
        meetingPointLat: formData.useMeetHalf ? null : formData.meetingPointLat,
        meetingPointLng: formData.useMeetHalf ? null : formData.meetingPointLng,
      };
      
      if (!user) {
        requestData.ownerId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      const response = await eventsApi.createEvent(requestData);
      
      const createdEventId = response.event.id;
      const createdShareUrl = `${window.location.origin}/events/${createdEventId}`;
      
      setEventId(createdEventId);
      setShareUrl(createdShareUrl);
      setShareDialogOpen(true);
      setSnackbar({ open: true, message: '聚會創建成功！', severity: 'success' });
    } catch (err: any) {
      console.error('創建聚會失敗:', err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || '創建失敗，請稍後再試', 
        severity: 'error' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Copy link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setSnackbar({ open: true, message: '連結已複製！', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: '複製失敗', severity: 'error' });
    }
  };

  // Share
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: formData.name,
          text: `加入我的聚會：${formData.name}`,
          url: shareUrl,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  // Close dialog
  const handleCloseDialog = () => {
    setShareDialogOpen(false);
    if (eventId) {
      navigate(`/events/${eventId}`);
    }
  };

  // Format datetime for input
  const formatDateTimeLocal = (date: Date) => {
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Header */}
      <header className="px-6 pt-10 pb-6 bg-white border-b border-slate-100">
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">返回</span>
        </button>
        <h1 className="text-2xl font-black text-slate-900 mb-1">創建聚會</h1>
        <p className="text-slate-400 text-sm font-medium">建立一個新的聚會，邀請朋友一起參加</p>
      </header>

      <main className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Name */}
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-3">聚會名稱</label>
            <input
              type="text"
              placeholder="例如：週五火鍋聚會"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-800"
              required
              autoFocus
            />
          </div>

          {/* Date & Time */}
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                <Calendar size={16} className="text-slate-400" />
                開始時間
              </label>
              <input
                type="datetime-local"
                value={formatDateTimeLocal(formData.startTime)}
                onChange={(e) => setFormData({ ...formData, startTime: new Date(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-800"
                required
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                <Clock size={16} className="text-slate-400" />
                結束時間
              </label>
              <input
                type="datetime-local"
                value={formatDateTimeLocal(formData.endTime)}
                onChange={(e) => setFormData({ ...formData, endTime: new Date(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-800"
                required
              />
            </div>
          </div>

          {/* MeetHalf Option */}
          <div 
            className={`
              rounded-[2rem] p-6 border-2 transition-all cursor-pointer
              ${formData.useMeetHalf 
                ? 'bg-blue-50 border-blue-500' 
                : 'bg-white border-slate-100'
              }
            `}
            onClick={() => {
              setFormData({
                ...formData,
                useMeetHalf: !formData.useMeetHalf,
                ...((!formData.useMeetHalf) ? {
                  meetingPointName: '',
                  meetingPointAddress: '',
                  meetingPointLat: null,
                  meetingPointLng: null,
                } : {}),
              });
            }}
          >
            <div className="flex items-start gap-3">
              <div className={`
                w-6 h-6 rounded-lg border-2 flex items-center justify-center mt-0.5 transition-all
                ${formData.useMeetHalf 
                  ? 'bg-blue-600 border-blue-600' 
                  : 'border-slate-300'
                }
              `}>
                {formData.useMeetHalf && <CheckCircle size={14} className="text-white" />}
              </div>
              <div>
                <span className="block text-sm font-bold text-slate-700">使用 MeetHalf 計算中間點</span>
                <span className="block text-[10px] text-slate-400 mt-1">
                  讓系統根據所有人的位置自動計算最佳集合地點
                </span>
              </div>
            </div>
          </div>

          {/* Location Selection */}
          {!formData.useMeetHalf && (
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                <MapPin size={16} className="text-slate-400" />
                集合地點
              </label>
              <div className="relative">
                <input
                  ref={autocompleteInputRef}
                  type="text"
                  placeholder="搜尋地點或地址..."
                  value={formData.meetingPointName}
                  onChange={(e) => setFormData({ ...formData, meetingPointName: e.target.value })}
                  className="w-full px-4 py-3 pl-10 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-slate-800"
                  required
                />
                <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 px-1">
                {formData.meetingPointLat && formData.meetingPointLng
                  ? `✓ 已選擇：${formData.meetingPointAddress || formData.meetingPointName}`
                  : '開始輸入以搜尋地點（使用 Google Places）'
                }
              </p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="space-y-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/30 disabled:opacity-50 active:scale-95 transition-all"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                '創建聚會'
              )}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
            >
              取消
            </button>
          </div>
        </form>
      </main>

      {/* Share Dialog */}
      {shareDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleCloseDialog}
          />
          
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-[2rem] rounded-t-[2rem] p-6 animate-bounce-subtle">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900">🎉 聚會創建成功！</h2>
              <button 
                onClick={handleCloseDialog}
                className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              分享以下連結給朋友，讓他們加入聚會：
            </p>

            {/* Link Display */}
            <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2 mb-4">
              <span className="flex-1 font-mono text-sm text-blue-600 truncate">
                {shareUrl}
              </span>
              <button 
                onClick={handleCopyLink}
                className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"
              >
                <Copy size={16} />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-3 px-4 border-2 border-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50"
              >
                <Copy size={16} />
                複製連結
              </button>
              {typeof navigator.share === 'function' && (
                <button
                  onClick={handleShare}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700"
                >
                  <Share2 size={16} />
                  分享
                </button>
              )}
            </div>

            <button
              onClick={handleCloseDialog}
              className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all"
            >
              前往聚會頁面
            </button>
          </div>
        </div>
      )}

      {/* Snackbar */}
      {snackbar.open && (
        <div 
          className="fixed bottom-6 left-6 right-6 z-50"
          onClick={() => setSnackbar({ ...snackbar, open: false })}
        >
          <div className={`
            p-4 rounded-2xl shadow-lg text-white font-medium text-center cursor-pointer
            ${snackbar.severity === 'success' ? 'bg-green-500' : snackbar.severity === 'error' ? 'bg-red-500' : 'bg-blue-500'}
          `}>
            {snackbar.message}
          </div>
        </div>
      )}
    </div>
  );
}
