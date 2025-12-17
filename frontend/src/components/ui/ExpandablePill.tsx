import React, { useState } from 'react';
import { Clock, MapPin, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface ExpandablePillProps {
  eventName: string;
  startTime: string | Date;
  endTime: string | Date;
  meetingPointName?: string;
  meetingPointAddress?: string;
  ownerName?: string;
  onShareClick?: () => void;
}

export const ExpandablePill: React.FC<ExpandablePillProps> = ({
  eventName,
  startTime,
  endTime,
  meetingPointName,
  meetingPointAddress,
  ownerName,
  onShareClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();
  const isOngoing = now >= start && now <= end;

  return (
    <div
      onClick={() => setIsExpanded(!isExpanded)}
      className={`
        flex flex-col overflow-hidden transition-all duration-300 ease-in-out cursor-pointer
        ${isExpanded 
          ? 'w-[85%] p-5 bg-white/90 rounded-[2rem]' 
          : 'w-auto px-4 py-2 bg-white/80 rounded-full'
        }
        backdrop-blur-xl border border-white shadow-lg
      `}
    >
      {!isExpanded ? (
        /* Collapsed State */
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isOngoing ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`} />
          <span className="text-sm font-black text-slate-800 truncate max-w-[120px]">{eventName}</span>
          <Clock size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-500">{format(start, 'HH:mm')}</span>
        </div>
      ) : (
        /* Expanded State */
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                {isOngoing ? '進行中' : now < start ? '即將開始' : '已結束'}
              </span>
              <h2 className="text-xl font-black text-slate-900 leading-tight">{eventName}</h2>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200"
            >
              <X size={16} />
            </button>
          </div>

          {/* Details */}
          <div className="space-y-2">
            {meetingPointName && (
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <MapPin size={16} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold">{meetingPointName}</div>
                  {meetingPointAddress && (
                    <div className="text-[10px] text-slate-400">{meetingPointAddress}</div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 text-slate-600">
              <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                <Clock size={16} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold">
                  {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                </div>
                <div className="text-[10px] text-slate-400">
                  {formatDistanceToNow(start, { addSuffix: true, locale: zhTW })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[8px] font-bold">
                {ownerName?.charAt(0).toUpperCase() || '?'}
              </div>
              <span className="text-[10px] font-medium text-slate-400">
                主揪：{ownerName || '未知'}
              </span>
            </div>
            {onShareClick && (
              <button 
                onClick={(e) => { e.stopPropagation(); onShareClick(); }}
                className="text-[10px] font-black text-blue-600 uppercase tracking-wider hover:text-blue-700"
              >
                分享連結
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpandablePill;

