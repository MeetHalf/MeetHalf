import React from 'react';
import { Trophy, Crown } from 'lucide-react';

interface PodiumMember {
  id: number;
  nickname: string;
  arrivalTime?: string | Date | null;
}

interface PodiumProps {
  members: PodiumMember[];
  className?: string;
}

export const Podium: React.FC<PodiumProps> = ({ members, className = '' }) => {
  // Sort by arrival time and get top 3
  const sortedMembers = [...members]
    .filter(m => m.arrivalTime)
    .sort((a, b) => {
      const timeA = new Date(a.arrivalTime!).getTime();
      const timeB = new Date(b.arrivalTime!).getTime();
      return timeA - timeB;
    });

  const first = sortedMembers[0];
  const second = sortedMembers[1];
  const third = sortedMembers[2];

  return (
    <div className={`flex items-end justify-center gap-2 h-48 px-4 ${className}`}>
      {/* 2nd Place */}
      <div className="flex flex-col items-center flex-1">
        <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-white mb-2 flex items-center justify-center font-black text-slate-600">
          {second?.nickname.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="w-full bg-slate-200 rounded-t-2xl h-16 flex items-center justify-center text-slate-500 font-bold">
          2nd
        </div>
        <span className="text-[10px] mt-1 font-bold text-slate-400 truncate w-full text-center">
          {second?.nickname || '-'}
        </span>
      </div>

      {/* 1st Place */}
      <div className="flex flex-col items-center flex-1">
        <div className="relative mb-2">
          <Trophy 
            className="absolute -top-6 left-1/2 -translate-x-1/2 text-orange-400" 
            size={24} 
            fill="currentColor"
          />
          <div className="w-16 h-16 rounded-full bg-blue-600 border-4 border-blue-50 flex items-center justify-center font-black text-white text-xl">
            {first?.nickname.charAt(0).toUpperCase() || '?'}
          </div>
        </div>
        <div className="w-full bg-blue-600 rounded-t-2xl h-24 flex items-center justify-center text-white font-bold">
          1st
        </div>
        <span className="text-[10px] mt-1 font-bold text-blue-600 truncate w-full text-center">
          {first?.nickname || '-'}
        </span>
      </div>

      {/* 3rd Place */}
      <div className="flex flex-col items-center flex-1">
        <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-white mb-2 flex items-center justify-center font-black text-slate-400">
          {third?.nickname.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="w-full bg-slate-100 rounded-t-2xl h-12 flex items-center justify-center text-slate-400 font-bold">
          3rd
        </div>
        <span className="text-[10px] mt-1 font-bold text-slate-400 truncate w-full text-center">
          {third?.nickname || '-'}
        </span>
      </div>
    </div>
  );
};

// Arrival list component for full rankings
interface ArrivalListProps {
  members: PodiumMember[];
  className?: string;
}

export const ArrivalList: React.FC<ArrivalListProps> = ({ members, className = '' }) => {
  const sortedMembers = [...members]
    .filter(m => m.arrivalTime)
    .sort((a, b) => {
      const timeA = new Date(a.arrivalTime!).getTime();
      const timeB = new Date(b.arrivalTime!).getTime();
      return timeA - timeB;
    });

  const formatTime = (time: string | Date) => {
    const date = new Date(time);
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2">
        到達時間
      </h3>
      {sortedMembers.map((member, idx) => (
        <div 
          key={member.id}
          className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100"
        >
          <div className="flex items-center gap-4">
            <span className="font-black text-slate-300 w-4">{idx + 1}</span>
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-slate-700">
              {member.nickname.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-slate-800">{member.nickname}</div>
              <div className="text-[10px] text-slate-400 font-bold">
                {formatTime(member.arrivalTime!)}
              </div>
            </div>
          </div>
          {idx === 0 && <Crown size={18} className="text-orange-400" fill="currentColor" />}
        </div>
      ))}
    </div>
  );
};

export default Podium;

