import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export const SortableItem = ({ id, children, isDragOverlay = false }: { id: string, children: React.ReactNode, isDragOverlay?: boolean }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative group/item ${isDragOverlay ? 'shadow-2xl ring-2 ring-primary-500 rounded-lg' : ''}`}>
      <div 
        {...attributes} 
        {...listeners}
        className={`absolute -left-3 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing opacity-0 group-hover/item:opacity-100 transition-opacity z-10 ${isDragging ? 'opacity-100' : ''}`}
      >
        <GripVertical size={14} />
      </div>
      {children}
    </div>
  );
};
