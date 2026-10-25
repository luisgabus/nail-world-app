import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
      <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-full mb-6 border border-slate-100">
        <Icon className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
      </div>
      
      <h3 className="text-xl font-semibold text-slate-800 mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-slate-500 max-w-md mb-8 leading-relaxed">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}