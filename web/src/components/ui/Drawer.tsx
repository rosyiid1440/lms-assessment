import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export const Drawer = ({ isOpen, onClose, title, children, width = 'w-96' }: DrawerProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => { 
      document.body.style.overflow = 'unset'; 
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={`relative bg-white shadow-2xl w-full max-w-[100vw] ${width} h-full flex flex-col transform transition-transform duration-300 ease-in-out animate-in slide-in-from-right`}
      >
        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-white">
          <h2 id="drawer-title" className="text-lg font-extrabold text-gray-900">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Close drawer"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {children}
        </div>
      </div>
    </div>
  );
};
