import React from 'react';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isArrived?: boolean;
  isCurrentUser?: boolean;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  className = '',
  isArrived = false,
  isCurrentUser = false,
  showOnlineIndicator = false,
  isOnline = false,
}) => {
  const initial = name.charAt(0).toUpperCase();
  
  return (
    <div className={`relative ${className}`}>
      <div 
        className={`
          ${sizeClasses[size]} rounded-2xl flex items-center justify-center font-black
          ${isArrived 
            ? 'bg-green-500 text-white' 
            : isCurrentUser
              ? 'bg-blue-50 text-blue-600 border-2 border-blue-500'
              : 'bg-slate-100 text-slate-500'
          }
        `}
      >
        {initial}
      </div>
      {showOnlineIndicator && (
        <div 
          className={`
            absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full
            ${isOnline ? 'bg-green-500' : 'bg-slate-300'}
          `}
        />
      )}
    </div>
  );
};

export default Avatar;

