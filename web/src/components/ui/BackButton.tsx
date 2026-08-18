import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  to: string;
  label: string;
}

export const BackButton = ({ to, label }: BackButtonProps) => {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors bg-white border border-gray-200 rounded-xl px-3.5 py-2 shadow-sm active:scale-[0.98]"
    >
      <ArrowLeft size={16} /> {label}
    </Link>
  );
};
