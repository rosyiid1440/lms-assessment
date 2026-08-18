import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SplitPaneProps {
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  initialLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  className?: string;
}

export const SplitPane = ({ 
  leftPane, 
  rightPane, 
  initialLeftWidth = 320, 
  minLeftWidth = 200, 
  maxLeftWidth = 600,
  className = ''
}: SplitPaneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Initialize width from localStorage or fallback to initial
  const [storedWidth] = useState(() => {
    const saved = localStorage.getItem('lms_splitpane_width');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= minLeftWidth && parsed <= maxLeftWidth) return parsed;
    }
    return initialLeftWidth;
  });

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging || !containerRef.current || !leftPaneRef.current) return;
    
    if (rafRef.current !== null) return;
    
    rafRef.current = requestAnimationFrame(() => {
      const containerRect = containerRef.current!.getBoundingClientRect();
      const newLeftWidth = e.clientX - containerRect.left;
      
      if (newLeftWidth >= minLeftWidth && newLeftWidth <= maxLeftWidth) {
        leftPaneRef.current!.style.width = `${newLeftWidth}px`;
      }
      rafRef.current = null;
    });
  }, [isDragging, minLeftWidth, maxLeftWidth]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    if (leftPaneRef.current) {
      const currentWidth = parseInt(leftPaneRef.current.style.width, 10);
      if (!isNaN(currentWidth)) {
        localStorage.setItem('lms_splitpane_width', currentWidth.toString());
      }
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      document.body.style.touchAction = 'auto';
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return (
    <div ref={containerRef} className={`flex flex-col lg:flex-row w-full h-full overflow-hidden ${className}`}>
      {/* Left Pane */}
      <div 
        ref={leftPaneRef} 
        style={{ '--left-w': `${storedWidth}px` } as React.CSSProperties}
        className="w-full lg:w-[var(--left-w)] flex-shrink-0 h-auto lg:h-full lg:overflow-y-auto overflow-y-auto max-h-[45vh] lg:max-h-none transition-none"
      >
        {leftPane}
      </div>

      {/* Resizer */}
      <div 
        className="hidden lg:flex w-1.5 bg-gray-200 hover:bg-primary-400 cursor-col-resize flex-shrink-0 items-center justify-center group transition-colors relative z-10 touch-none"
        onPointerDown={startDrag}
      >
        <div className={`w-1 h-8 rounded-full transition-colors ${isDragging ? 'bg-primary-500' : 'bg-gray-300 group-hover:bg-primary-500'}`}></div>
      </div>

      {/* Right Pane */}
      <div className="flex-1 h-auto lg:h-full overflow-y-auto min-w-0">
        {rightPane}
      </div>
    </div>
  );
};
