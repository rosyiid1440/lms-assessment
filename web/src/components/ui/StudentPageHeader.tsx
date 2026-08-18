import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StudentPageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const StudentPageHeader = ({ icon: Icon, title, description }: StudentPageHeaderProps) => {
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
        <Icon size={24} />
      </div>
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight truncate">{title}</h1>
        <p className="text-xs md:text-sm text-gray-500 font-medium truncate">{description}</p>
      </div>
    </div>
  );
};