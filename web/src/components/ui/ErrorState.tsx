import React from 'react';
import { RefreshCcw, AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState = ({ message = 'Something went wrong while fetching data.', onRetry }: ErrorStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-xl border border-red-100">
      <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle size={24} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Failed to load data</h3>
      <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <RefreshCcw size={16} /> Retry
        </button>
      )}
    </div>
  );
};
