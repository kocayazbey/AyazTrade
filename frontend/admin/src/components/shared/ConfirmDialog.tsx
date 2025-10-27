'use client';

import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Onayla',
  cancelText = 'İptal',
  variant = 'danger',
  loading = false
}: ConfirmDialogProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const variantClasses = {
    danger: 'text-ios-red',
    warning: 'text-ios-orange',
    info: 'text-ios-blue'
  };

  const buttonClasses = {
    danger: 'bg-ios-red text-white hover:bg-red-700',
    warning: 'bg-ios-orange text-white hover:bg-orange-700',
    info: 'bg-ios-blue text-white hover:bg-blue-700'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-white rounded-ios-lg shadow-ios-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ios-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-ios bg-${variant === 'danger' ? 'ios-red' : variant === 'warning' ? 'ios-orange' : 'ios-blue'}/10`}>
              <AlertTriangle className={`w-5 h-5 ${variantClasses[variant]}`} />
            </div>
            <h2 className="text-xl font-bold text-ios-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-ios-gray-100 rounded-ios transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-ios-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-ios-gray-700">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-ios-gray-200 bg-ios-gray-50">
          <button
            onClick={onClose}
            className="ios-button ios-button-secondary"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`ios-button ${buttonClasses[variant]}`}
            disabled={loading}
          >
            {loading ? 'İşleniyor...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}