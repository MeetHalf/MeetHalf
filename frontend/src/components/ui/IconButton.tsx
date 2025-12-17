import React from 'react';
import { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  size?: number;
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ 
  icon: Icon, 
  onClick, 
  active = false,
  className = '',
  size = 20,
  disabled = false,
}) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`
      w-12 h-12 rounded-2xl flex items-center justify-center 
      transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed
      ${active 
        ? 'bg-blue-600 text-white shadow-lg' 
        : 'bg-white text-slate-500 shadow-sm border border-slate-100 hover:bg-slate-50'
      }
      ${className}
    `}
  >
    <Icon size={size} />
  </button>
);

export default IconButton;

