import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '',
  onClick 
}) => (
  <div 
    className={`bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl shadow-sm ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

export default GlassCard;

