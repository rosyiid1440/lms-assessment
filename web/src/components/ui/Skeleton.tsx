import React from 'react';

export const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
    <div className="flex justify-between items-center mb-4">
      <div className="w-16 h-5 bg-gray-200 rounded-full"></div>
      <div className="w-20 h-4 bg-gray-200 rounded"></div>
    </div>
    <div className="w-3/4 h-6 bg-gray-200 rounded mb-2"></div>
    <div className="w-1/2 h-4 bg-gray-200 rounded mb-6"></div>
    <div className="w-1/3 h-4 bg-gray-200 rounded mb-4"></div>
    <div className="border-t border-gray-100 pt-4 flex gap-2">
      <div className="w-full h-8 bg-gray-200 rounded"></div>
      <div className="w-8 h-8 bg-gray-200 rounded"></div>
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
    <div className="p-4 border-b border-gray-200 bg-gray-50">
      <div className="w-48 h-8 bg-gray-200 rounded"></div>
    </div>
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-6 py-3"><div className="w-20 h-4 bg-gray-200 rounded"></div></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r} className="border-t border-gray-100">
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c} className="px-6 py-4">
                <div className="w-3/4 h-4 bg-gray-200 rounded mb-1"></div>
                <div className="w-1/2 h-3 bg-gray-100 rounded"></div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
