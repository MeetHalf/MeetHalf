import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { 
  Plus, 
  Clock, 
  ChevronRight, 
  Trophy, 
  Home as HomeIcon, 
  Users, 
  LayoutGrid,
  Loader2,
} from 'lucide-react';

import { eventsApi, Event } from '../api/events';
import { useAuth } from '../hooks/useAuth';
import { IconButton } from '../components/ui';

export default function Events() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await eventsApi.getEvents();
      setEvents(response.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (eventId: number) => {
    navigate(`/events/${eventId}`);
  };

  // Split events into active and past
  const activeEvents = events.filter(e => e.status !== 'ended');
  const pastEvents = events.filter(e => e.status === 'ended');

  // Mock groups (can be replaced with real data later)
  const groups = [
    { id: 101, name: "午餐團", avatar: "🍱" },
    { id: 102, name: "週末爬山", avatar: "🏔️" },
    { id: 103, name: "羽球社", avatar: "🏸" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="px-6 pt-10 pb-6 bg-white border-b border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">MeetHalf</h1>
            <p className="text-slate-400 text-sm font-medium">大家到哪了？</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-blue-600 font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>
        </div>

        {/* Groups Scroll */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 -mx-2 px-2">
          {/* New Meet Button */}
          <button 
            onClick={() => navigate('/events/new')} 
            className="flex-shrink-0 flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Plus size={24} />
            </div>
            <span className="text-[10px] font-bold text-slate-500">新活動</span>
          </button>
          
          {/* Groups */}
          {groups.map(g => (
            <div key={g.id} className="flex-shrink-0 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-3xl bg-white border border-slate-100 flex items-center justify-center text-3xl shadow-sm">
                {g.avatar}
              </div>
              <span className="text-[10px] font-bold text-slate-500 truncate w-16 text-center">{g.name}</span>
            </div>
          ))}
        </div>
      </header>

      <main className="p-6 space-y-8">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm">
            {error}
            <button 
              onClick={fetchEvents} 
              className="ml-2 text-red-700 font-bold underline"
            >
              重試
            </button>
          </div>
        )}

        {/* Active Events */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-slate-800">進行中的活動</h2>
            <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Live
            </span>
          </div>
          
          {activeEvents.length > 0 ? (
            <div className="space-y-4">
              {activeEvents.map(e => (
                <div 
                  key={e.id} 
                  onClick={() => handleEventClick(e.id)} 
                  className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group cursor-pointer active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">
                      📍
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {e.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <Clock size={12} />
                        <span>{format(new Date(e.startTime), 'HH:mm', { locale: zhTW })}</span>
                        <span>•</span>
                        <span>{e._count?.members || e.members?.length || 0} 人</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">🗓️</div>
              <p className="text-slate-500 text-sm font-medium">目前沒有進行中的活動</p>
              <button
                onClick={() => navigate('/events/new')}
                className="mt-4 px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-full"
              >
                建立新活動
              </button>
            </div>
          )}
        </section>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <section>
            <h2 className="font-bold text-slate-800 mb-4">歷史記錄</h2>
            <div className="space-y-3">
              {pastEvents.map(e => (
                <div 
                  key={e.id} 
                  onClick={() => handleEventClick(e.id)} 
                  className="bg-slate-100/50 p-4 rounded-2xl flex items-center justify-between opacity-80 cursor-pointer hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl grayscale">🕒</div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">{e.name}</h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        {format(new Date(e.startTime), 'MM/dd', { locale: zhTW })}
                      </span>
                    </div>
                  </div>
                  <Trophy size={14} className="text-slate-300" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Stats */}
        {events.length > 0 && (
          <section className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">統計</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-black text-blue-600">{events.length}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">活動</div>
              </div>
              <div>
                <div className="text-2xl font-black text-green-600">
                  {events.reduce((sum, e) => sum + (e._count?.members || e.members?.length || 0), 0)}
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">總人次</div>
              </div>
              <div>
                <div className="text-2xl font-black text-orange-500">
                  {events.length > 0 
                    ? Math.max(...events.map(e => e._count?.members || e.members?.length || 0)) 
                    : 0
                  }
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">最大人數</div>
              </div>
            </div>
          </section>
        )}

        {/* Empty State */}
        {events.length === 0 && !error && (
          <div className="text-center py-12 px-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-slate-100 mb-6">
              <span className="text-5xl">📭</span>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">還沒有活動</h3>
            <p className="text-slate-500 text-sm mb-6">建立第一個活動來開始使用 MeetHalf</p>
            <button
              onClick={() => navigate('/events/new')}
              className="px-8 py-3 bg-blue-600 text-white font-black rounded-full shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
            >
              <Plus size={18} className="inline mr-2" />
              建立新活動
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-100 px-8 py-4 flex justify-around items-center z-50 safe-bottom">
        <IconButton icon={HomeIcon} active onClick={() => navigate('/events')} />
        <IconButton icon={Users} onClick={() => {}} />
        <IconButton icon={LayoutGrid} onClick={() => {}} />
      </nav>
    </div>
  );
}
