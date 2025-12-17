import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Users, Calendar, ChevronRight } from 'lucide-react';

interface EventCardProps {
  id: number;
  name: string;
  memberCount: number;
  createdAt: string;
  status?: 'upcoming' | 'ongoing' | 'ended';
  startTime?: string;
  onClick: () => void;
}

export default function EventCard({ 
  id, 
  name, 
  memberCount, 
  createdAt, 
  status,
  startTime,
  onClick 
}: EventCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case 'ongoing':
        return (
          <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            進行中
          </span>
        );
      case 'upcoming':
        return (
          <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            即將開始
          </span>
        );
      case 'ended':
        return (
          <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            已結束
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer hover:shadow-md active:scale-95 transition-all"
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">
          📍
        </div>
        
        {/* Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-[200px]">
              {name}
            </h3>
            {getStatusBadge()}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
            {startTime && (
              <>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {format(new Date(startTime), 'MM/dd HH:mm', { locale: zhTW })}
                </span>
                <span>•</span>
              </>
            )}
            <span className="flex items-center gap-1">
              <Users size={12} />
              {memberCount} 人
            </span>
          </div>
          
          {!startTime && (
            <div className="text-[10px] text-slate-300 font-medium mt-1">
              #{id} • 建立於 {format(new Date(createdAt), 'yyyy/MM/dd', { locale: zhTW })}
            </div>
          )}
        </div>
      </div>
      
      <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
    </div>
  );
}

// Legacy export for backwards compatibility
export { EventCard as GroupCard };
