import React, { useEffect } from 'react';
import './AyuModal.css';

interface AyuModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  maskClosable?: boolean;
  className?: string;
}

const AyuModal: React.FC<AyuModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closable = true,
  maskClosable = true,
  className = '',
}) => {
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
      if (e.key === 'Escape' && isOpen && closable) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closable, onClose]);

  if (!isOpen) return null;

  const handleMaskClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && maskClosable) {
      onClose();
    }
  };

  const baseClasses = 'ayu-modal';
  const sizeClasses = `ayu-modal--${size}`;

  const modalClasses = [
    baseClasses,
    sizeClasses,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className="ayu-modal-overlay" onClick={handleMaskClick}>
      <div className={modalClasses}>
        {/* Header */}
        {(title || closable) && (
          <div className="ayu-modal__header">
            {title && (
              <h2 className="ayu-modal__title">
                {title}
              </h2>
            )}
            
            {closable && (
              <button
                className="ayu-modal__close"
                onClick={onClose}
                aria-label="Close modal"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 4L4 12M4 4L12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="ayu-modal__body">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="ayu-modal__footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default AyuModal;
