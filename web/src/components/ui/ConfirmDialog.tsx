import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog = ({
  isOpen, onClose, onConfirm, title, description, 
  confirmText = 'Confirm', cancelText = 'Cancel', 
  isDestructive = true, isLoading = false
}: ConfirmDialogProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose();
      if (e.key === 'Enter' && !isLoading) onConfirm();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        const btn = modalRef.current?.querySelector('button.confirm-btn') as HTMLElement;
        if (btn) btn.focus();
      }, 50);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, onConfirm, isLoading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => !isLoading && onClose()} />
      <div 
        ref={modalRef}
        role="dialog" 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 transform transition-all flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-600'}`}>
            <AlertTriangle size={28} strokeWidth={2} />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">{description}</p>
          
          <div className="w-full flex flex-col sm:flex-row gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isLoading}
              className="w-full sm:w-1/2 px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button 
              type="button" 
              onClick={onConfirm} 
              disabled={isLoading}
              className={`confirm-btn w-full sm:w-1/2 px-5 py-2.5 text-sm font-bold text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 flex justify-center items-center gap-2 ${
                isDestructive 
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-red-500/20 shadow-lg' 
                  : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 shadow-primary-500/20 shadow-lg'
              }`}
            >
              {isLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
              {isLoading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
