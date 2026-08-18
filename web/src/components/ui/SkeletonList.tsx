import React from 'react';

export const SkeletonList = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 animate-pulse flex gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0"></div>
        <div className="flex-1 space-y-2 py-1">
          <div className="w-1/3 h-4 bg-gray-200 rounded"></div>
          <div className="w-1/2 h-3 bg-gray-100 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTree = ({ count = 4 }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="animate-pulse flex items-center gap-2 py-2">
        <div className="w-4 h-4 bg-gray-200 rounded"></div>
        <div className="flex-1 h-4 bg-gray-200 rounded"></div>
      </div>
    ))}
  </div>
);
