'use client';

import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="w-16 h-16 rounded-full bg-ios-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-ios-gray-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-ios-gray-900 mb-2">{title}</h3>
      <p className="text-ios-gray-600 text-center mb-6 max-w-sm">{description}</p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="ios-button ios-button-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}