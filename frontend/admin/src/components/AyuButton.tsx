import React from 'react';
import './AyuButton.css';

interface AyuButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const AyuButton: React.FC<AyuButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
}) => {
  const baseClasses = 'ayu-btn';
  const variantClasses = `ayu-btn--${variant}`;
  const sizeClasses = `ayu-btn--${size}`;
  const stateClasses = disabled ? 'ayu-btn--disabled' : '';
  const loadingClasses = loading ? 'ayu-btn--loading' : '';

  const classes = [
    baseClasses,
    variantClasses,
    sizeClasses,
    stateClasses,
    loadingClasses,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span className="ayu-btn__spinner" />}
      <span className={loading ? 'ayu-btn__content--loading' : 'ayu-btn__content'}>
        {children}
      </span>
    </button>
  );
};

export default AyuButton;
