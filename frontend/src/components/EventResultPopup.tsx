import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  X, 
  Trophy, 
  Crown, 
  Clock, 
  XCircle, 
  Zap,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

import { eventsApi } from '../api/events';
import type { EventResult, RankingItem, MemberStatus } from '../types/events';
import { Podium, ArrivalList } from './ui';

interface EventResultPopupProps {
  open: boolean;
  onClose: () => void;
  eventId: number;
}

const getStatusLabel = (status: MemberStatus): string => {
  switch (status) {
    case 'early':
      return '提早到達';
    case 'ontime':
      return '準時到達';
    case 'late':
      return '遲到';
    case 'absent':
      return '缺席';
    default:
      return '未知';
  }
};

const formatTime = (timeString?: string): string => {
  if (!timeString) return '--';
  const date = new Date(timeString);
  return format(date, 'HH:mm:ss');
};

export default function EventResultPopup({ open, onClose, eventId }: EventResultPopupProps) {
  const [result, setResult] = useState<EventResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && eventId) {
      loadResult();
    }
  }, [open, eventId]);

  const loadResult = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await eventsApi.getEventResult(eventId);
      setResult(response.result);
    } catch (err: any) {
      console.error('Failed to load event result:', err);
      setError(err.response?.data?.message || '載入排行榜失敗');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  // Prepare data
  const arrived = result?.rankings
    .filter(r => r.arrivalTime)
    .sort((a, b) => {
      const timeA = new Date(a.arrivalTime!).getTime();
      const timeB = new Date(b.arrivalTime!).getTime();
      return timeA - timeB;
    }) || [];

  const late = result?.rankings.filter(r => r.status === 'late') || [];
  const absent = result?.rankings.filter(r => r.status === 'absent') || [];

  // Calculate on-time rate
  const onTimeRate = result && result.stats.totalMembers > 0
    ? Math.round(((result.stats.totalMembers - result.stats.lateCount - result.stats.absentCount) / result.stats.totalMembers) * 100)
    : 0;

  // Podium members
  const podiumMembers = arrived.slice(0, 3).map(r => ({
    id: r.memberId,
    nickname: r.nickname || '未知',
    arrivalTime: r.arrivalTime,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-[2rem] rounded-t-[2rem] max-h-[90vh] overflow-hidden flex flex-col animate-bounce-subtle">
        {/* Header */}
        <header className="flex items-center justify-between p-6 border-b border-slate-100">
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-100"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black text-slate-900">Leaderboard</h1>
          <div className="w-12 h-12" /> {/* Spacer */}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm text-center">
              {error}
              <button 
                onClick={loadResult}
                className="ml-2 font-bold underline"
              >
                重試
              </button>
            </div>
          )}

          {result && (
            <>
              {/* Stats Summary */}
              <div className="bg-slate-50 rounded-[2rem] p-5 mb-8 border border-slate-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 text-center">
                  統計數據
                </h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-white rounded-2xl p-3 text-center border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">總參加</div>
                    <div className="text-xl font-black text-slate-800">{result.stats.totalMembers}</div>
                  </div>
                  <div className="bg-white rounded-2xl p-3 text-center border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">已到達</div>
                    <div className="text-xl font-black text-green-600">{result.stats.arrivedCount}</div>
                  </div>
                  <div className="bg-white rounded-2xl p-3 text-center border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">準時率</div>
                    <div className="text-xl font-black text-blue-600">{onTimeRate}%</div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 text-center font-medium">
                  遲到 {result.stats.lateCount} 人 · 缺席 {result.stats.absentCount} 人 · 總戳數 {result.stats.totalPokes || 0}
                </p>
              </div>

              {/* Podium */}
              {podiumMembers.length > 0 && (
                <div className="mb-10">
                  <Podium members={podiumMembers} />
                </div>
              )}

              {/* Full Arrival List */}
              {arrived.length > 0 && (
                <div className="space-y-4 mb-8">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2">
                    到達時間
                  </h3>
                  {arrived.map((r, idx) => (
                    <div 
                      key={r.memberId}
                      className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-black text-slate-300 w-4">{idx + 1}</span>
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center font-bold
                          ${r.status === 'late' 
                            ? 'bg-orange-50 text-orange-600' 
                            : 'bg-white text-slate-700 border border-slate-100'
                          }
                        `}>
                          {r.nickname?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{r.nickname}</div>
                          <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                            <Clock size={10} />
                            {formatTime(r.arrivalTime)}
                            {r.status === 'late' && r.lateMinutes && (
                              <span className="text-orange-500 ml-1">
                                (遲到 {r.lateMinutes} 分鐘)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.pokeCount > 0 && (
                          <div className="flex items-center gap-1 text-orange-500 text-xs font-bold">
                            <Zap size={12} />
                            {r.pokeCount}
                          </div>
                        )}
                        {idx === 0 && <Crown size={18} className="text-orange-400" fill="currentColor" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Late Section */}
              {late.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={16} className="text-orange-500" />
                    <h3 className="text-sm font-bold text-slate-700">遲到 ({late.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {late.map(r => (
                      <div 
                        key={r.memberId}
                        className="bg-white p-3 rounded-xl border-l-4 border-orange-400 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 font-bold text-sm">
                            {r.nickname?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-700">{r.nickname}</div>
                            <div className="text-[10px] text-slate-400">
                              {r.lateMinutes ? `遲到 ${r.lateMinutes} 分鐘` : '遲到'}
                            </div>
                          </div>
                        </div>
                        {r.pokeCount > 0 && (
                          <div className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-1 rounded-lg text-[10px] font-bold">
                            <Zap size={10} />
                            {r.pokeCount}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Absent Section */}
              {absent.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <XCircle size={16} className="text-red-500" />
                    <h3 className="text-sm font-bold text-slate-700">缺席 ({absent.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {absent.map(r => (
                      <div 
                        key={r.memberId}
                        className="bg-white p-3 rounded-xl border-l-4 border-red-400 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 font-bold text-sm">
                            {r.nickname?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-700">{r.nickname}</div>
                            <div className="text-[10px] text-slate-400">未到達</div>
                          </div>
                        </div>
                        {r.pokeCount > 0 && (
                          <div className="flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-lg text-[10px] font-bold">
                            <Zap size={10} />
                            {r.pokeCount}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Poke Stats Footer */}
              {result.pokes && result.pokes.mostPoked && result.pokes.mostPoker && 
               (result.pokes.mostPoked.count > 0 || result.pokes.mostPoker.count > 0) && (
                <div className="bg-orange-50 rounded-[2rem] p-5 border border-orange-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Zap size={48} className="text-orange-500" />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2 flex items-center gap-1.5">
                    <Zap size={14} fill="currentColor" /> 戳人統計
                  </h3>
                  <p className="text-sm text-slate-700 font-medium">
                    最常被戳：
                    <span className="font-bold"> {result.pokes.mostPoked.nickname} ({result.pokes.mostPoked.count}次)</span>
                    <br />
                    最愛戳人：
                    <span className="font-bold"> {result.pokes.mostPoker.nickname} ({result.pokes.mostPoker.count}次)</span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-900 text-white rounded-3xl font-black shadow-xl active:scale-95 transition-all"
          >
            返回活動
          </button>
        </div>
      </div>
    </div>
  );
}
