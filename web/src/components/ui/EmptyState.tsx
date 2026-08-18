import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { FileBox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({ icon: Icon = FileBox, title, description, action, className = '' }: EmptyStateProps) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-gray-100 shadow-sm border-dashed ${className}`}>
      <div className="w-20 h-20 bg-gray-50/80 text-primary-300 rounded-full flex items-center justify-center mb-6 ring-8 ring-gray-50/50">
        <Icon size={36} strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-8 text-center max-w-sm leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
