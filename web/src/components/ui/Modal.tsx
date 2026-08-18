import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export const Modal = ({ isOpen, onClose, title, children, width = 'max-w-md' }: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Tangani auto-focus dan scroll body HANYA saat status isOpen berubah
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Auto-focus input pertama hanya ketika modal benar-benar baru terbuka
      const timer = setTimeout(() => {
        const firstInput = modalRef.current?.querySelector('input, textarea, select') as HTMLElement;
        if (firstInput) firstInput.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]); // Dependensi eksklusif pada isOpen, mengabaikan perubahan fungsi onClose

  // Tangani event keyboard secara terpisah
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className={`bg-white rounded-2xl shadow-2xl w-full ${width} relative z-10 transform scale-100 opacity-100 transition-all duration-300 flex flex-col max-h-[90vh]`}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-xl font-extrabold text-gray-900">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
