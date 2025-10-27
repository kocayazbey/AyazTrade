import React from 'react';
import './AyuBadge.css';

interface AyuBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  dot?: boolean;
  count?: number;
  maxCount?: number;
}

const AyuBadge: React.FC<AyuBadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  dot = false,
  count,
  maxCount = 99,
}) => {
  const baseClasses = 'ayu-badge';
  const variantClasses = `ayu-badge--${variant}`;
  const sizeClasses = `ayu-badge--${size}`;

  const badgeClasses = [
    baseClasses,
    variantClasses,
    sizeClasses,
    className,
  ].filter(Boolean).join(' ');

  const displayCount = count !== undefined ? (count > maxCount ? `${maxCount}+` : count.toString()) : null;

  return (
    <div className="ayu-badge-wrapper">
      {children}
      
      {(dot || displayCount) && (
        <span className={badgeClasses}>
          {dot ? '•' : displayCount}
        </span>
      )}
    </div>
  );
};

export default AyuBadge;
