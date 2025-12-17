import React, { useState, useRef, useEffect } from 'react';

interface BottomDrawerProps {
  children: React.ReactNode;
  title?: string;
  rightElement?: React.ReactNode;
  defaultOpen?: boolean;
  minHeight?: number;
  maxHeightPercent?: number;
}

export const BottomDrawer: React.FC<BottomDrawerProps> = ({
  children,
  title,
  rightElement,
  defaultOpen = false,
  minHeight = 96, // 24 * 4 = h-24
  maxHeightPercent = 75,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isDragging, setIsDragging] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(minHeight);
  const drawerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const maxHeight = typeof window !== 'undefined' 
    ? (window.innerHeight * maxHeightPercent) / 100 
    : 500;

  useEffect(() => {
    if (isOpen) {
      setCurrentHeight(maxHeight);
    } else {
      setCurrentHeight(minHeight);
    }
  }, [isOpen, maxHeight, minHeight]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    startHeightRef.current = currentHeight;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const deltaY = startYRef.current - e.touches[0].clientY;
    const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeightRef.current + deltaY));
    setCurrentHeight(newHeight);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Snap to open or closed
    const threshold = (maxHeight - minHeight) / 2;
    if (currentHeight > minHeight + threshold) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      ref={drawerRef}
      className={`
        absolute bottom-0 left-0 w-full bg-white rounded-t-[3rem] 
        shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-30
        transition-all duration-500 ease-out
      `}
      style={{ height: `${currentHeight}px` }}
    >
      {/* Drag Handle */}
      <div 
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-8 flex justify-center items-center cursor-pointer touch-none"
      >
        <div className="w-12 h-1 bg-slate-200 rounded-full" />
      </div>

      {/* Header */}
      {(title || rightElement) && (
        <div className="px-6 pb-4 flex justify-between items-center">
          {title && (
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
          )}
          {rightElement}
        </div>
      )}

      {/* Content */}
      <div className="px-6 overflow-y-auto" style={{ maxHeight: `calc(${currentHeight}px - 80px)` }}>
        {children}
      </div>
    </div>
  );
};

export default BottomDrawer;

